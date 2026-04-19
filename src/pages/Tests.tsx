import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
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
  ClipboardList,
  Clock,
  BookOpen,
  CheckCircle,
  Award,
  Lock,
  PlayCircle,
} from "lucide-react";

export default function Tests() {
  const { user } = useAuth();

  const [batchId, setBatchId] = useState<string>("all");
  const [myBatches, setMyBatches] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [activeBatchIds, setActiveBatchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTests = async () => {
      try {
        const testsSnap = await getDocs(collection(db, "tests"));

        const rawTests = testsSnap.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        const visibleTests = rawTests.filter(
          (test: any) => test.isVisible !== false
        );

        const testsWithCounts = await Promise.all(
          visibleTests.map(async (test: any) => {
            try {
              const qSnap = await getDocs(
                query(collection(db, "testQuestions"), where("testId", "==", test.id))
              );

              let batchData: any = null;

              if (test.batchId) {
                try {
                  const batchSnap = await getDoc(doc(db, "batches", test.batchId));
                  if (batchSnap.exists()) {
                    batchData = {
                      id: batchSnap.id,
                      ...batchSnap.data(),
                    };
                  }
                } catch (error) {
                  console.error("Batch fetch error:", error);
                }
              }

              return {
                ...test,
                questionsCount: qSnap.size,
                batchData,
              };
            } catch (error) {
              console.error("Question count error:", error);
              return {
                ...test,
                questionsCount: 0,
                batchData: null,
              };
            }
          })
        );

        testsWithCounts.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setTests(testsWithCounts);
      } catch (error) {
        console.error("Error loading tests:", error);
        setTests([]);
      }
    };

    const loadSubscriptionsAndBatches = async () => {
      if (!user?.email && !user?.uid) {
        setMyBatches([]);
        setActiveBatchIds([]);
        return;
      }

      try {
        const subscriptionMaps = new Map<string, any>();

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

        const subscriptions = Array.from(subscriptionMaps.values());
        const now = new Date();

        const validBatchIds = subscriptions
          .filter((sub: any) => {
            if (sub.active !== true) return false;

            if (!sub.expiryDate) return true;

            const expiry =
              typeof sub.expiryDate?.toDate === "function"
                ? sub.expiryDate.toDate()
                : new Date(sub.expiryDate);

            if (isNaN(expiry.getTime())) return true;

            return expiry >= now;
          })
          .map((sub: any) => sub.batchId)
          .filter(Boolean);

        setActiveBatchIds(validBatchIds);

        const batchList: any[] = [];

        for (const id of validBatchIds) {
          try {
            const batchSnap = await getDoc(doc(db, "batches", id));

            if (batchSnap.exists()) {
              const batchData = {
                id: batchSnap.id,
                ...batchSnap.data(),
              } as any;

              if (batchData.isVisible !== false) {
                batchList.push(batchData);
              }
            }
          } catch (error) {
            console.error("Batch load error:", error);
          }
        }

        setMyBatches(batchList);
      } catch (error) {
        console.error("Error loading subscriptions/batches:", error);
        setMyBatches([]);
        setActiveBatchIds([]);
      }
    };

    const loadResults = async () => {
      if (!user?.email && !user?.uid) {
        setResults([]);
        return;
      }

      const resultMap = new Map<string, any>();

      if (user?.email) {
        try {
          const resultsQueryByEmail = query(
            collection(db, "testResults"),
            where("userEmail", "==", user.email)
          );

          const resultsSnapByEmail = await getDocs(resultsQueryByEmail);

          resultsSnapByEmail.docs.forEach((docItem) => {
            resultMap.set(docItem.id, {
              id: docItem.id,
              ...docItem.data(),
            });
          });
        } catch (error) {
          console.error("Results email query error:", error);
        }
      }

      if (user?.uid) {
        try {
          const resultsQueryByUid = query(
            collection(db, "testResults"),
            where("userUid", "==", user.uid)
          );

          const resultsSnapByUid = await getDocs(resultsQueryByUid);

          resultsSnapByUid.docs.forEach((docItem) => {
            resultMap.set(docItem.id, {
              id: docItem.id,
              ...docItem.data(),
            });
          });
        } catch (error) {
          console.error("Results uid query error:", error);
        }
      }

      const resultsList = Array.from(resultMap.values());

      resultsList.sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });

      setResults(resultsList);
    };

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        loadTests(),
        loadSubscriptionsAndBatches(),
        loadResults(),
      ]);
      setLoading(false);
    };

    loadAll();
  }, [user?.email, user?.uid]);

  const filteredTests = useMemo(() => {
    if (batchId === "all") return tests;
    return tests.filter((test: any) => test.batchId === batchId);
  }, [tests, batchId]);

  const getLatestResult = (testId: string) => {
    return results.find((r: any) => r.testId === testId);
  };

  const renderCTA = (test: any, attempted: boolean) => {
    const isPremiumTest = test.isPremium === true;
    const hasAccess = !isPremiumTest || activeBatchIds.includes(test.batchId);
    const batchInactive = test.batchData?.isActive === false;

    if (!isPremiumTest) {
      return (
        <Link href={`/tests/${test.id}`}>
          <Button size="sm" variant={attempted ? "outline" : "default"}>
            <PlayCircle className="w-4 h-4 mr-2" />
            {attempted ? "Re-attempt" : "Start Test"}
          </Button>
        </Link>
      );
    }

    if (!user?.email && !user?.uid) {
      return (
        <Link href="/login">
          <Button size="sm" variant="outline">
            <Lock className="w-4 h-4 mr-2" />
            Login
          </Button>
        </Link>
      );
    }

    if (batchInactive) {
      return (
        <Button size="sm" variant="outline" disabled>
          Batch Inactive
        </Button>
      );
    }

    if (!hasAccess) {
      return (
        <Link href={`/batches/${test.batchId}`}>
          <Button size="sm" variant="outline">
            <Lock className="w-4 h-4 mr-2" />
            Unlock
          </Button>
        </Link>
      );
    }

    return (
      <Link href={`/tests/${test.id}`}>
        <Button size="sm" variant={attempted ? "outline" : "default"}>
          <PlayCircle className="w-4 h-4 mr-2" />
          {attempted ? "Re-attempt" : "Start Test"}
        </Button>
      </Link>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif">Practice Tests</h1>
            <p className="text-muted-foreground mt-1">
              Attempt available tests and track your performance
            </p>
          </div>

          <div className="flex gap-3">
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {myBatches.map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.batchName || b.name || "Unnamed Batch"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""} available
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tests available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTests.map((test: any) => {
              const myResult = getLatestResult(test.id);
              const attempted = !!myResult;
              const isPremiumTest = test.isPremium === true;

              return (
                <Card
                  key={test.id}
                  className="border-border hover:shadow-md transition-shadow rounded-2xl"
                >
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPremiumTest
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                        }`}
                    >
                      {isPremiumTest ? (
                        <Lock className="w-6 h-6 text-orange-600" />
                      ) : (
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-base">{test.title}</h3>

                        {isPremiumTest ? (
                          <Badge variant="secondary" className="text-xs">
                            Premium
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Free
                          </Badge>
                        )}

                        {attempted && (
                          <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                            <CheckCircle className="w-3 h-3" /> Attempted
                          </Badge>
                        )}
                      </div>

                      {test.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {test.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {test.durationMinutes || 0} min
                        </span>

                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {test.questionsCount || 0} questions
                        </span>

                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {test.totalMarks || 0} marks
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 shrink-0">
                      {myResult && (
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {myResult.score}/{myResult.totalMarks}
                          </p>
                          <p
                            className={`text-xs ${Number(myResult.percentage || 0) >= 60
                                ? "text-green-600"
                                : "text-orange-600"
                              }`}
                          >
                            {Number(myResult.percentage || 0).toFixed(1)}%
                          </p>
                        </div>
                      )}

                      {renderCTA(test, attempted)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">My Performance</h2>

          {results.length === 0 ? (
            <Card className="border-border border-dashed rounded-2xl">
              <CardContent className="p-8 text-center">
                <Award className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No test history yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.slice(0, 8).map((r: any) => (
                <Link key={r.id} href={`/tests/result/${r.id}`}>
                  <Card className="border-border rounded-2xl cursor-pointer hover:shadow-md transition">
                    <CardContent className="p-5 flex items-center gap-4">
                      <Award
                        className={`w-5 h-5 shrink-0 ${Number(r.percentage || 0) >= 60
                            ? "text-green-500"
                            : "text-orange-500"
                          }`}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.testTitle || "Untitled Test"}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
                          className={`text-xs ${Number(r.percentage || 0) >= 60
                              ? "text-green-600"
                              : "text-orange-600"
                            }`}
                        >
                          {Number(r.percentage || 0).toFixed(1)}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}