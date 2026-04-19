import BrandLogo from "@/components/branding/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  GraduationCap,
  ClipboardList,
  BookOpen,
  ChevronRight,
  Award,
  Sparkles,
  LifeBuoy,
  ArrowUpRight,
  BookMarked,
  Trophy,
  ShieldCheck,
  TrendingUp,
  Star,
  ChevronsUpDown,
  Flame,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { settings } = useAppSettings();

  const [batches, setBatches] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [showAllResults, setShowAllResults] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.email && !user?.uid) {
        setBatchLoading(false);
        setDashboardLoading(false);
        setBatches([]);
        setResults([]);
        return;
      }

      try {
        setBatchLoading(true);
        setDashboardLoading(true);

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

        const resultMap = new Map<string, any>();

        if (user?.email) {
          try {
            const resultsSnapByEmail = await getDocs(
              query(collection(db, "testResults"), where("userEmail", "==", user.email))
            );

            resultsSnapByEmail.docs.forEach((docItem) => {
              resultMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          } catch (error) {
            console.error("Dashboard results email query error:", error);
          }
        }

        if (user?.uid) {
          try {
            const resultsSnapByUid = await getDocs(
              query(collection(db, "testResults"), where("userUid", "==", user.uid))
            );

            resultsSnapByUid.docs.forEach((docItem) => {
              resultMap.set(docItem.id, {
                id: docItem.id,
                ...docItem.data(),
              });
            });
          } catch (error) {
            console.error("Dashboard results uid query error:", error);
          }
        }

        const resultsList = Array.from(resultMap.values());

        resultsList.sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });

        setResults(resultsList);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setBatches([]);
        setResults([]);
      } finally {
        setBatchLoading(false);
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.email, user?.uid, settings.supportEnabled]);

  const activePremiumCount = batches.filter((b) => b.hasPremium).length;
  const expiredPremiumCount = batches.filter((b) => b.isExpired).length;

  const averagePercentage =
    results.length > 0
      ? (
        results.reduce((sum, item: any) => sum + Number(item.percentage || 0), 0) /
        results.length
      ).toFixed(1)
      : "0.0";

  const latestBatch = batches[0];
  const latestResult = results[0];
  const visibleResults = showAllResults ? results.slice(0, 6) : results.slice(0, 2);

  const quickLinks = useMemo(
    () => [
      { href: "/notes", label: "My Notes", icon: BookOpen, sub: "Study materials" },
      { href: "/tests", label: "Practice Tests", icon: ClipboardList, sub: "Attempt tests" },
      ...(settings.supportEnabled
        ? [{ href: "/support", label: "Help & Support", icon: LifeBuoy, sub: "Need help?" }]
        : []),
      { href: "/profile", label: "My Profile", icon: GraduationCap, sub: "Manage account" },
    ],
    [settings.supportEnabled]
  );

  const statCards = [
    {
      label: "My Batches",
      value: batches.length,
      icon: GraduationCap,
      iconWrap: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Premium",
      value: activePremiumCount,
      icon: Sparkles,
      iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Tests",
      value: results.length,
      icon: ClipboardList,
      iconWrap: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Avg Score",
      value: `${averagePercentage}%`,
      icon: TrendingUp,
      iconWrap: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <Layout>
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute top-40 right-0 w-[300px] h-[220px] bg-accent/10 blur-3xl rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
          <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-background via-background to-primary/5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 opacity-60 pointer-events-none">
              <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-accent/10 blur-3xl" />
            </div>

            <div className="relative p-5 md:p-7">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20">
                      {user?.semester ? `Semester ${user.semester}` : "Student Dashboard"}
                    </Badge>

                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1 text-xs font-medium border-white/10"
                    >
                      Physics Honours
                    </Badge>

                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1 text-xs font-medium border-white/10"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      Secure
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <BrandLogo tone="light" variant="full" size="md" />

                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                      Hello,{" "}
                      <span className="brand-gradient-text">
                        {user?.fullName?.split(" ")[0] || "Student"}
                      </span>
                    </h1>
                  </div>

                  <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-6">
                    Continue your study journey with enrolled batches, premium content,
                    tests, notes, and support in one place.
                  </p>

                  <div className="flex flex-wrap gap-3 mt-5">
                    <Link href="/my-batches">
                      <Button
                        size="lg"
                        className="rounded-2xl h-11 px-5 gap-2 brand-gradient text-white brand-glow"
                      >
                        Continue Learning
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>

                    <Link href="/tests">
                      <Button
                        variant="outline"
                        size="lg"
                        className="rounded-2xl h-11 px-5 border-border/70 bg-background/60"
                      >
                        Practice Tests
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full xl:w-[320px]">
                  {statCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-background/80 backdrop-blur-sm p-4 shadow-md hover:shadow-xl transition"
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${item.iconWrap}`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <p className="text-xl md:text-2xl font-bold tracking-tight">
                        {item.value}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickLinks.map((l) => (
              <Link key={l.href} href={l.href}>
                <button className="w-full rounded-2xl border bg-card hover:bg-muted/40 transition-all duration-200 px-4 py-4 text-left group shadow-sm hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <l.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{l.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{l.sub}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                  </div>
                </button>
              </Link>
            ))}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card className="rounded-[28px] border shadow-sm overflow-hidden">
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                        My Batches
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Only your enrolled batches appear here
                      </p>
                    </div>

                    <Link href="/my-batches">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-1 border-border/70"
                      >
                        Browse More <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>

                  {batchLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-40 rounded-3xl" />
                      ))}
                    </div>
                  ) : batches.length === 0 ? (
                    <Card className="border-dashed rounded-3xl bg-muted/20">
                      <CardContent className="p-8 text-center">
                        <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                          <GraduationCap className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No enrolled batches yet</h3>
                        <p className="text-sm text-muted-foreground mb-5">
                          Enroll in a batch to start learning from your dashboard.
                        </p>
                        <Link href="/batches">
                          <Button className="rounded-2xl px-6">Explore Batches</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {batches.slice(0, 4).map((batch) => (
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
                                      Premium
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full px-2.5 py-1 shrink-0"
                                    >
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
                                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted">
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
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                        Recent Test Results
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Compact performance view
                      </p>
                    </div>

                    {results.length > 2 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2 border-border/70"
                        onClick={() => setShowAllResults((prev) => !prev)}
                      >
                        {showAllResults ? "Show Less" : "Show More"}
                        <ChevronsUpDown className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>

                  {dashboardLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-2xl" />
                      ))}
                    </div>
                  ) : results.length === 0 ? (
                    <Card className="border-dashed rounded-2xl bg-muted/20">
                      <CardContent className="p-8 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                          <Trophy className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-muted-foreground">No tests attempted yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {visibleResults.map((r) => (
                        <Card
                          key={r.id}
                          className="rounded-2xl border hover:shadow-md transition bg-card/90"
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${Number(r.percentage || 0) >= 60
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                }`}
                            >
                              <Award className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {r.testTitle || "Untitled Test"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {r.createdAt?.toDate
                                  ? r.createdAt.toDate().toLocaleDateString("en-IN")
                                  : "Recently"}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-bold text-sm">
                                {r.score}/{r.totalMarks}
                              </p>
                              <p
                                className={`text-xs mt-1 font-medium ${Number(r.percentage || 0) >= 60
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-orange-600 dark:text-orange-400"
                                  }`}
                              >
                                {Number(r.percentage || 0).toFixed(1)}%
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-[28px] border shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 border-b bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-primary" />
                      <h2 className="text-lg md:text-xl font-bold">Student Overview</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Quick study snapshot</p>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="rounded-2xl border p-3 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-1">Latest Batch</p>
                      <p className="font-semibold text-sm">
                        {latestBatch?.name || latestBatch?.batchName || "No batch enrolled"}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-3 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-1">Average Score</p>
                      <p className="font-semibold text-sm">{averagePercentage}%</p>
                    </div>

                    <div className="rounded-2xl border p-3 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-1">Latest Result</p>
                      <p className="font-semibold text-sm">
                        {latestResult?.testTitle || "No tests yet"}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-3 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-1">Premium Expired</p>
                      <p className="font-semibold text-sm">{expiredPremiumCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[28px] border shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 border-b bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-primary" />
                      <h2 className="text-lg md:text-xl font-bold">Study Actions</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Fast access to your main student tools
                    </p>
                  </div>

                  <div className="p-4 space-y-3">
                    {quickLinks.map((l) => (
                      <Link key={l.href} href={l.href}>
                        <button className="w-full rounded-2xl border bg-card hover:bg-muted/40 transition-all duration-200 px-4 py-4 text-left group shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <l.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm">{l.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {l.sub}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                          </div>
                        </button>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}