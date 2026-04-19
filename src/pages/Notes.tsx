import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  ExternalLink,
  Lock,
  CheckCircle2,
  FileQuestion,
} from "lucide-react";
import { useLocation } from "wouter";
import { checkPremiumAccess } from "@/lib/access";

function normalizeId(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getTypeIcon(type: string) {
  if (type === "PYQ") return FileQuestion;
  return FileText;
}

export default function Notes() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [allVisibleBatches, setAllVisibleBatches] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [premiumBatchIds, setPremiumBatchIds] = useState<string[]>([]);
  const [accessibleBatchIds, setAccessibleBatchIds] = useState<string[]>([]);

  useEffect(() => {
    const loadMaterialsPage = async () => {
      setLoading(true);

      try {
        // 1) Load visible + active batches
        const batchSnap = await getDocs(collection(db, "batches"));
        const visibleBatches = batchSnap.docs
          .map((docItem) => ({
            id: normalizeId(docItem.id),
            ...docItem.data(),
          }))
          .filter((b: any) => b.isVisible !== false && b.isActive !== false);

        setAllVisibleBatches(visibleBatches);

        // 2) Build premium access list
        let unlockedPremiumBatchIds: string[] = [];

        if (user?.email) {
          const premiumChecks = await Promise.all(
            visibleBatches.map(async (batch: any) => {
              const allowed = await checkPremiumAccess(user.email, batch.id);
              return allowed ? batch.id : null;
            })
          );

          unlockedPremiumBatchIds = premiumChecks.filter(Boolean) as string[];
        }

        const uniquePremiumBatchIds = [...new Set(unlockedPremiumBatchIds)];
        setPremiumBatchIds(uniquePremiumBatchIds);

        // 3) Accessible visible batch ids
        const visibleBatchIds = visibleBatches.map((b: any) => normalizeId(b.id));
        setAccessibleBatchIds(visibleBatchIds);

        // 4) Load only existing collections safely
        const [notesResult, pyqsResult] = await Promise.allSettled([
          getDocs(collection(db, "notes")),
          getDocs(collection(db, "pyqs")),
        ]);

        const notesSnap =
          notesResult.status === "fulfilled" ? notesResult.value : { docs: [] as any[] };

        const pyqsSnap =
          pyqsResult.status === "fulfilled" ? pyqsResult.value : { docs: [] as any[] };

        if (notesResult.status === "rejected") {
          console.error("Notes collection read failed:", notesResult.reason);
        }
        if (pyqsResult.status === "rejected") {
          console.error("PYQs collection read failed:", pyqsResult.reason);
        }

        const buildItem = async (docItem: any, forcedType: "Notes" | "PYQ") => {
          const data = docItem.data() as any;
          const batchId = normalizeId(data.batchId);
          const subjectId = normalizeId(data.subjectId);

          let batchData: any = null;

          if (batchId) {
            const matchedBatch = visibleBatches.find(
              (b: any) => normalizeId(b.id) === batchId
            );

            if (matchedBatch) {
              batchData = matchedBatch;
            } else {
              try {
                const batchDoc = await getDoc(doc(db, "batches", batchId));
                if (batchDoc.exists()) {
                  batchData = {
                    id: batchDoc.id,
                    ...batchDoc.data(),
                  };
                }
              } catch (error) {
                console.error("Failed to load batch for material:", error);
              }
            }
          }

          return {
            id: docItem.id,
            ...data,
            batchId,
            subjectId,
            batchData,
            normalizedType: forcedType,
          };
        };

        const mergedItems = await Promise.all([
          ...notesSnap.docs.map((docItem) => buildItem(docItem, "Notes")),
          ...pyqsSnap.docs.map((docItem) => buildItem(docItem, "PYQ")),
        ]);

        const visibleItems = mergedItems.filter((item: any) => {
          if (item.isVisible === false) return false;
          if (!item.batchId) return false;
          if (!visibleBatchIds.includes(item.batchId)) return false;
          if (item.batchData?.isVisible === false) return false;
          if (item.batchData?.isActive === false) return false;
          return true;
        });

        visibleItems.sort((a: any, b: any) => {
          const batchCompare = normalizeId(a.batchId).localeCompare(normalizeId(b.batchId));
          if (batchCompare !== 0) return batchCompare;

          const subjectCompare = normalizeId(a.subjectId).localeCompare(normalizeId(b.subjectId));
          if (subjectCompare !== 0) return subjectCompare;

          const typeOrder = { Notes: 1, PYQ: 2 };
          const typeCompare =
            (typeOrder[a.normalizedType as keyof typeof typeOrder] || 99) -
            (typeOrder[b.normalizedType as keyof typeof typeOrder] || 99);
          if (typeCompare !== 0) return typeCompare;

          const orderA = Number(a.order || 0);
          const orderB = Number(b.order || 0);
          if (orderA !== orderB) return orderA - orderB;

          return String(a.title || "").localeCompare(String(b.title || ""));
        });

        setMaterials(visibleItems);
      } catch (error) {
        console.error("Error loading materials page:", error);
        setAllVisibleBatches([]);
        setMaterials([]);
        setPremiumBatchIds([]);
        setAccessibleBatchIds([]);
      } finally {
        setLoading(false);
      }
    };

    loadMaterialsPage();
  }, [user?.email]);

  const visibleBatchOptions = useMemo(() => {
    return allVisibleBatches.filter((b: any) =>
      accessibleBatchIds.includes(normalizeId(b.id))
    );
  }, [allVisibleBatches, accessibleBatchIds]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((item: any) => {
      const batchMatch =
        selectedBatchId === "all" || normalizeId(item.batchId) === normalizeId(selectedBatchId);

      const typeMatch = selectedType === "all" || item.normalizedType === selectedType;

      return batchMatch && typeMatch;
    });
  }, [materials, selectedBatchId, selectedType]);

  const getBatchName = (batchId: string) => {
    const batch = allVisibleBatches.find(
      (b: any) => normalizeId(b.id) === normalizeId(batchId)
    );
    return batch?.name || batch?.batchName || "Unknown Batch";
  };

  const handleOpenMaterial = (item: any) => {
    const isPremiumItem = item.isPremium === true;
    const isUnlocked = premiumBatchIds.includes(normalizeId(item.batchId));
    const batchInactive = item.batchData?.isActive === false;

    if (!isPremiumItem) {
      if (item.fileUrl) {
        window.open(item.fileUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (batchInactive) return;

    if (!isUnlocked) {
      navigate(`/batches/${item.batchId}`);
      return;
    }

    if (item.fileUrl) {
      window.open(item.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif">Study Notes</h1>
            <p className="text-muted-foreground mt-1">
              Notes and PYQs from visible batches
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {visibleBatchOptions.map((b: any) => (
                  <SelectItem key={b.id} value={normalizeId(b.id)}>
                    {b.name || b.batchName || "Unnamed Batch"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Notes">Notes</SelectItem>
                <SelectItem value="PYQ">PYQ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No materials available</p>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground mt-2">
                Sign in to unlock premium materials
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((item: any) => {
              const isPremiumItem = item.isPremium === true;
              const premiumUnlocked = premiumBatchIds.includes(normalizeId(item.batchId));
              const batchInactive = item.batchData?.isActive === false;
              const TypeIcon = getTypeIcon(item.normalizedType);

              return (
                <Card
                  key={`${item.normalizedType}-${item.id}`}
                  className="border-border hover:shadow-md transition-all rounded-2xl cursor-pointer"
                  onClick={() => handleOpenMaterial(item)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <TypeIcon className="w-5 h-5 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-snug">
                          {item.title || "Untitled Material"}
                        </p>

                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          {getBatchName(item.batchId)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="secondary" className="text-xs">
                        {item.normalizedType}
                      </Badge>

                      {batchInactive ? (
                        <Badge variant="outline" className="text-xs">
                          Batch Inactive
                        </Badge>
                      ) : isPremiumItem ? (
                        premiumUnlocked ? (
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Premium
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Lock className="w-3 h-3" />
                            Locked
                          </Badge>
                        )
                      ) : (
                        <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                          Free
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {batchInactive ? (
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" disabled>
                          <Lock className="w-3.5 h-3.5" />
                          Inactive
                        </Button>
                      ) : isPremiumItem ? (
                        premiumUnlocked ? (
                          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
                            <ExternalLink className="w-3.5 h-3.5" />
                            View PDF
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
                            <Lock className="w-3.5 h-3.5" />
                            {isAuthenticated ? "Unlock" : "Login"}
                          </Button>
                        )
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View PDF
                        </Button>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {item.createdAt?.toDate
                          ? item.createdAt.toDate().toLocaleDateString("en-IN")
                          : item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-IN")
                          : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}