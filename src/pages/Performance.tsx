import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Award, ArrowLeft, Trophy } from "lucide-react";

export default function Performance() {
    const { user } = useAuth();

    const [results, setResults] = useState<any[]>([]);
    const [semester, setSemester] = useState<string>("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadResults = async () => {
            if (!user?.email && !user?.uid) {
                setResults([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const resultMap = new Map<string, any>();

                if (user?.email) {
                    const snap = await getDocs(
                        query(collection(db, "testResults"), where("userEmail", "==", user.email))
                    );

                    snap.docs.forEach((docItem) => {
                        resultMap.set(docItem.id, {
                            id: docItem.id,
                            ...docItem.data(),
                        });
                    });
                }

                if (user?.uid) {
                    const snap = await getDocs(
                        query(collection(db, "testResults"), where("userUid", "==", user.uid))
                    );

                    snap.docs.forEach((docItem) => {
                        resultMap.set(docItem.id, {
                            id: docItem.id,
                            ...docItem.data(),
                        });
                    });
                }

                const list = Array.from(resultMap.values());

                list.sort((a: any, b: any) => {
                    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return bTime - aTime;
                });

                setResults(list);
            } catch (error) {
                console.error("Performance load error:", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        loadResults();
    }, [user?.email, user?.uid]);



    const filteredResults = useMemo(() => {
        if (semester === "all") return results;

        return results.filter((item: any) => {
            const resultSemester = String(item.semester || item.batchSemester || "");
            return resultSemester === semester;
        });
    }, [results, semester]);

    const averageScore =
        filteredResults.length > 0
            ? (
                filteredResults.reduce(
                    (sum, item: any) => sum + Number(item.percentage || 0),
                    0
                ) / filteredResults.length
            ).toFixed(1)
            : "0.0";

    const bestResult = filteredResults.reduce((best: any, item: any) => {
        if (!best) return item;
        return Number(item.percentage || 0) > Number(best.percentage || 0) ? item : best;
    }, null);

    return (
        <Layout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <Link href="/tests">
                        <Button variant="ghost" className="gap-2 mb-4 px-0">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Tests
                        </Button>
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold font-serif">My Performance</h1>
                            <p className="text-muted-foreground mt-1">
                                Full test history and score overview
                            </p>
                        </div>

                        <Select value={semester} onValueChange={setSemester}>
                            <SelectTrigger className="w-full md:w-56 rounded-2xl">
                                <SelectValue placeholder="Select Semester" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Semesters</SelectItem>
                                {[1, 2, 3, 4, 5, 6].map((sem) => (
                                    <SelectItem key={sem} value={String(sem)}>
                                        Semester {sem}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <Card className="rounded-2xl">
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">Total Tests</p>
                            <p className="text-3xl font-bold mt-2">{filteredResults.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">Average Score</p>
                            <p className="text-3xl font-bold mt-2">{averageScore}%</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">Best Score</p>
                            <p className="text-3xl font-bold mt-2">
                                {bestResult ? Number(bestResult.percentage || 0).toFixed(1) : "0.0"}%
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-20 rounded-2xl" />
                        ))}
                    </div>
                ) : filteredResults.length === 0 ? (
                    <Card className="border-dashed rounded-2xl">
                        <CardContent className="p-10 text-center">
                            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                No performance history found for this semester
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredResults.map((r: any) => (
                            <Link key={r.id} href={`/tests/result/${r.id}`}>
                                <Card className="border-border rounded-2xl cursor-pointer hover:shadow-md transition">
                                    <CardContent className="p-5 flex items-center gap-4">
                                        <Award
                                            className={`w-6 h-6 shrink-0 ${Number(r.percentage || 0) >= 60
                                                ? "text-green-500"
                                                : "text-orange-500"
                                                }`}
                                        />

                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">
                                                {r.testTitle || "Untitled Test"}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Semester {r.semester || r.batchSemester || "-"} •{" "}
                                                {r.createdAt?.toDate
                                                    ? r.createdAt.toDate().toLocaleDateString("en-IN")
                                                    : "Recently"}
                                            </p>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="font-bold">
                                                {r.score}/{r.totalMarks}
                                            </p>
                                            <p
                                                className={`text-xs font-medium mt-1 ${Number(r.percentage || 0) >= 60
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
        </Layout>
    );
}