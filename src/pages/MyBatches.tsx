import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BookMarked,
  GraduationCap,
  Search,
  Sparkles,
  Clock3,
} from "lucide-react";

export default function MyBatches() {
  const { user } = useAuth();

  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadMyBatches = async () => {
      if (!user?.uid && !user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const now = new Date();

        const enrollmentMap = new Map<string, any>();
        const subscriptionMap = new Map<string, any>();

        if (user?.email) {
          try {
            const enrollSnapByEmail = await getDocs(
              query(collection(db, "enrollments"), where("userEmail", "==", user.email))
            );

            enrollSnapByEmail.docs.forEach((docItem) => {
              enrollmentMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          } catch (error) {
            console.error("Enrollment email query error:", error);
          }

          try {
            const subSnapByEmail = await getDocs(
              query(collection(db, "subscriptions"), where("userEmail", "==", user.email))
            );

            subSnapByEmail.docs.forEach((docItem) => {
              subscriptionMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          } catch (error) {
            console.error("Subscription email query error:", error);
          }
        }

        if (user?.uid) {
          try {
            const enrollSnapByUid = await getDocs(
              query(collection(db, "enrollments"), where("userUid", "==", user.uid))
            );

            enrollSnapByUid.docs.forEach((docItem) => {
              enrollmentMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          } catch (error) {
            console.error("Enrollment uid query error:", error);
          }

          try {
            const subSnapByUid = await getDocs(
              query(collection(db, "subscriptions"), where("userUid", "==", user.uid))
            );

            subSnapByUid.docs.forEach((docItem) => {
              subscriptionMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          } catch (error) {
            console.error("Subscription uid query error:", error);
          }
        }

        const enrollments = Array.from(enrollmentMap.values()) as any[];
        const subscriptions = Array.from(subscriptionMap.values()) as any[];
        const allBatchesSnap = await getDocs(collection(db, "batches"));
        const allBatches = allBatchesSnap.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })) as any[];

        const batchList: any[] = [];

        for (const enrollment of enrollments) {
          const matchedBatch = allBatches.find((b) => b.id === enrollment.batchId);
          if (!matchedBatch) continue;

          if (matchedBatch.isActive === false || matchedBatch.isVisible === false) {
            continue;
          }

          const batchSubscriptions = subscriptions.filter(
            (sub) => sub.batchId === matchedBatch.id
          );

          let hasPremium = false;
          let isExpired = false;
          let expiryDate: Date | null = null;

          for (const sub of batchSubscriptions) {
            if (sub.active !== true) continue;

            if (!sub.expiryDate) {
              hasPremium = true;
              isExpired = false;
              expiryDate = null;
              break;
            }

            let parsedExpiry: Date | null = null;

            if (typeof sub.expiryDate?.toDate === "function") {
              parsedExpiry = sub.expiryDate.toDate();
            } else {
              const parsed = new Date(sub.expiryDate);
              parsedExpiry = isNaN(parsed.getTime()) ? null : parsed;
            }

            if (!parsedExpiry || parsedExpiry >= now) {
              hasPremium = true;
              isExpired = false;
              expiryDate = parsedExpiry;
              break;
            } else {
              expiryDate = parsedExpiry;
              isExpired = true;
            }
          }

          batchList.push({
            ...matchedBatch,
            enrollmentId: enrollment.id,
            isEnrolled: true,
            hasPremium,
            isExpired,
            expiryDate,
            canOpen: true,
          });
        }

        batchList.sort((a, b) => {
          if (a.hasPremium === b.hasPremium) {
            return (a.name || a.batchName || "").localeCompare(
              b.name || b.batchName || ""
            );
          }
          return a.hasPremium ? -1 : 1;
        });

        setBatches(batchList);
      } catch (error) {
        console.error("Error loading my batches:", error);
        setBatches([]);
      } finally {
        setLoading(false);
      }
    };

    loadMyBatches();
  }, [user?.email, user?.uid]);

  const filteredBatches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return batches;

    return batches.filter((batch) => {
      const name = (batch.name || batch.batchName || "").toLowerCase();
      const semester = String(batch.semester || "").toLowerCase();
      return name.includes(term) || semester.includes(term);
    });
  }, [batches, search]);

  const premiumCount = batches.filter((b) => b.hasPremium).length;
  const expiredCount = batches.filter((b) => b.isExpired && !b.hasPremium).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-background via-background to-primary/5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 opacity-60 pointer-events-none">
            <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="relative p-5 md:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20">
                    My Learning Space
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                    Enrolled Batches Only
                  </Badge>
                </div>

                <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                  My Batches
                </h1>

                <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-6">
                  Access all your enrolled batches from one place. Premium and free enrolled
                  batches are shown here.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full lg:w-[340px]">
                <div className="rounded-2xl border border-white/10 bg-background/75 backdrop-blur-sm p-4 shadow-sm">
                  <p className="text-xl md:text-2xl font-bold tracking-tight">{batches.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Total</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-background/75 backdrop-blur-sm p-4 shadow-sm">
                  <p className="text-xl md:text-2xl font-bold tracking-tight">{premiumCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Premium</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-background/75 backdrop-blur-sm p-4 shadow-sm">
                  <p className="text-xl md:text-2xl font-bold tracking-tight">{expiredCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Expired</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border bg-card shadow-sm">
          <div className="p-5 md:p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Enrolled Batches</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Only the batches you enrolled in are visible here
                </p>
              </div>

              <div className="relative w-full md:w-[280px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search my batches..."
                  className="w-full h-11 rounded-2xl border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-44 rounded-3xl" />
                ))}
              </div>
            ) : filteredBatches.length === 0 ? (
              <Card className="border-dashed rounded-3xl bg-muted/20">
                <CardContent className="p-10 text-center">
                  <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-7 h-7" />
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    {batches.length === 0 ? "No enrolled batches yet" : "No matching batch found"}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-5">
                    {batches.length === 0
                      ? "Start by enrolling in a batch to begin your learning journey."
                      : "Try another search term."}
                  </p>

                  {batches.length === 0 && (
                    <Link href="/batches">
                      <Button className="rounded-2xl px-6">Explore Batches</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredBatches.map((batch) => (
                  <Link key={batch.id} href={`/batches/${batch.id}`}>
                    <Card className="group overflow-hidden rounded-[26px] border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-card/90 backdrop-blur-sm">
                      <CardContent className="p-0">
                        <div
                          className={`h-1.5 ${batch.hasPremium
                            ? "bg-gradient-to-r from-primary via-primary/80 to-accent"
                            : "bg-gradient-to-r from-slate-400 via-slate-300 to-slate-200"
                            }`}
                        />

                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <BookMarked className="w-6 h-6 text-primary" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="text-base font-bold leading-snug truncate group-hover:text-primary transition">
                                  {batch.name || batch.batchName || "Unnamed Batch"}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Semester {batch.semester || "-"}
                                </p>
                              </div>
                            </div>

                            {batch.hasPremium ? (
                              <Badge className="rounded-full px-2.5 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 border-0 shrink-0">
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                Premium
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full px-2.5 py-1 shrink-0">
                                Free
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            <span
                              className={`text-[11px] px-2.5 py-1 rounded-full ${batch.hasPremium
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                                }`}
                            >
                              {batch.hasPremium ? "Premium Unlocked" : "Free Access"}
                            </span>

                            {batch.expiryDate ? (
                              <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted inline-flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                Till {batch.expiryDate.toLocaleDateString("en-IN")}
                              </span>
                            ) : null}

                            {batch.isExpired && !batch.hasPremium ? (
                              <span className="text-[11px] px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                                Expired
                              </span>
                            ) : null}
                          </div>

                          <Button className="w-full rounded-2xl h-10 gap-2 shadow-md shadow-primary/10">
                            {batch.hasPremium ? "Let’s Study" : "Open Batch"}
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}