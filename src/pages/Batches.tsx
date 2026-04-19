import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Batches() {
  const [semester, setSemester] = useState<string>("all");
  const [batches, setBatches] = useState<any[]>([]);
  const [enrolledBatchIds, setEnrolledBatchIds] = useState<string[]>([]);
  const [purchasedBatchIds, setPurchasedBatchIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { isAuthenticated, user } = useAuth();

  const fetchBatches = async () => {
    setIsLoading(true);

    try {
      const batchSnap = await getDocs(collection(db, "batches"));
      const batchList = batchSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((b: any) => b.isVisible !== false && b.isActive !== false);

      setBatches(batchList);

      if (isAuthenticated && (user?.uid || user?.email)) {
        try {
          const enrollmentMap = new Map<string, any>();

          if (user?.email) {
            const enrollSnapByEmail = await getDocs(
              query(collection(db, "enrollments"), where("userEmail", "==", user.email))
            );

            enrollSnapByEmail.docs.forEach((docItem) => {
              enrollmentMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          }

          if (user?.uid) {
            const enrollSnapByUid = await getDocs(
              query(collection(db, "enrollments"), where("userUid", "==", user.uid))
            );

            enrollSnapByUid.docs.forEach((docItem) => {
              enrollmentMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          }

          const enrolledIds = Array.from(enrollmentMap.values())
            .map((e: any) => e.batchId)
            .filter(Boolean);

          setEnrolledBatchIds([...new Set(enrolledIds)]);
        } catch {
          setEnrolledBatchIds([]);
        }

        try {
          const subscriptionMap = new Map<string, any>();

          if (user?.email) {
            const subSnapByEmail = await getDocs(
              query(
                collection(db, "subscriptions"),
                where("userEmail", "==", user.email),
                where("active", "==", true)
              )
            );

            subSnapByEmail.docs.forEach((docItem) => {
              subscriptionMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          }

          if (user?.uid) {
            const subSnapByUid = await getDocs(
              query(
                collection(db, "subscriptions"),
                where("userUid", "==", user.uid),
                where("active", "==", true)
              )
            );

            subSnapByUid.docs.forEach((docItem) => {
              subscriptionMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          }

          const now = new Date();

          const purchasedIds = Array.from(subscriptionMap.values())
            .filter((sub: any) => {
              if (!sub.batchId) return false;
              if (sub.active !== true) return false;

              if (!sub.expiryDate) return true;

              let expiryDate: Date | null = null;

              if (typeof sub.expiryDate?.toDate === "function") {
                expiryDate = sub.expiryDate.toDate();
              } else {
                const parsed = new Date(sub.expiryDate);
                expiryDate = isNaN(parsed.getTime()) ? null : parsed;
              }

              if (!expiryDate) return true;
              return expiryDate >= now;
            })
            .map((sub: any) => sub.batchId);

          setPurchasedBatchIds([...new Set(purchasedIds)]);
        } catch {
          setPurchasedBatchIds([]);
        }
      } else {
        setEnrolledBatchIds([]);
        setPurchasedBatchIds([]);
      }
    } catch (error) {
      console.error("Error loading batches:", error);
      setBatches([]);
      setEnrolledBatchIds([]);
      setPurchasedBatchIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [isAuthenticated, user?.email, user?.uid]);

  const filteredBatches = useMemo(() => {
    if (semester === "all") return batches;
    return batches.filter((b) => String(b.semester) === semester);
  }, [batches, semester]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">All Batches</h1>
            <p className="text-muted-foreground mt-1">
              Explore available physics batches and start learning.
            </p>
          </div>

          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  Semester {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No batches found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try changing the semester filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatches.map((batch: any) => {
              const isEnrolled = enrolledBatchIds.includes(batch.id);
              const isPurchased = purchasedBatchIds.includes(batch.id);
              const batchTitle = batch.batchName || batch.name || "Unnamed Batch";

              return (
                <Card
                  key={batch.id}
                  className="rounded-3xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-accent" />

                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <Badge className="w-fit">Semester {batch.semester}</Badge>

                      {isPurchased ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Unlocked
                        </Badge>
                      ) : isEnrolled ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary"
                        >
                          Enrolled
                        </Badge>
                      ) : null}
                    </div>

                    <h3 className="font-bold text-2xl leading-tight">
                      {batchTitle}
                    </h3>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 min-h-[52px]">
                      {batch.description || "No description available"}
                    </p>

                    <p className="text-3xl font-bold text-primary mb-6">
                      ₹{batch.price || 0}
                    </p>

                    <Link href={`/batches/${batch.id}`}>
                      <Button className="w-full text-base py-6 rounded-2xl shadow-sm gap-2">
                        {isPurchased ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Let’s Study
                          </>
                        ) : isEnrolled ? (
                          "Go to Batch"
                        ) : (
                          "Enroll Now"
                        )}
                      </Button>
                    </Link>
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