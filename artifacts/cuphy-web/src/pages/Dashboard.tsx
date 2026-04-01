import { useAuth } from "@/contexts/AuthContext";
import { useGetMyBatches, useGetMyTestResults, useListNotices, getGetMyBatchesQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  GraduationCap, ClipboardList, Bell, BookOpen, PlayCircle,
  TrendingUp, ChevronRight, Award
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: batchesData, isLoading: batchLoading } = useGetMyBatches({
    query: { queryKey: getGetMyBatchesQueryKey() }
  });
  const { data: resultsData } = useGetMyTestResults();
  const { data: noticesData } = useListNotices({ type: "notice" });

  const batches = batchesData?.batches ?? [];
  const results = resultsData?.results ?? [];
  const notices = noticesData?.notices ?? [];

  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
    : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif">
            Hello, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.semester ? `Semester ${user.semester} • ` : ""}Physics Honours, Calcutta University
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Enrolled Batches", value: batches.length, icon: GraduationCap, color: "text-purple-500" },
            { label: "Tests Attempted", value: results.length, icon: ClipboardList, color: "text-blue-500" },
            { label: "Avg. Score", value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: "text-green-500" },
            { label: "Active Notices", value: notices.length, icon: Bell, color: "text-orange-500" },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4">
                <div className={`${s.color} mb-2`}><s.icon className="w-5 h-5" /></div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Batches */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">My Batches</h2>
              <Link href="/batches">
                <Button variant="ghost" size="sm" className="gap-1">Browse More <ChevronRight className="w-3 h-3" /></Button>
              </Link>
            </div>

            {batchLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : batches.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="p-8 text-center">
                  <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No batches enrolled yet</p>
                  <Link href="/batches">
                    <Button size="sm">Browse Batches</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {batches.map(batch => (
                  <Link key={batch.id} href={`/batches/${batch.id}`}>
                    <Card className="border-border hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{batch.name}</p>
                          <p className="text-xs text-muted-foreground">Semester {batch.semester}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">Enrolled</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Recent results */}
            {results.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Recent Test Results</h2>
                </div>
                <div className="space-y-2">
                  {results.slice(0, 3).map(r => (
                    <Card key={r.id} className="border-border">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Award className={`w-5 h-5 shrink-0 ${r.percentage >= 60 ? 'text-green-500' : 'text-orange-500'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Test #{r.testId}</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.submittedAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{r.score}/{r.totalMarks}</p>
                          <p className={`text-xs ${r.percentage >= 60 ? 'text-green-600' : 'text-orange-600'}`}>
                            {r.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notices */}
          <div>
            <h2 className="text-lg font-bold mb-4">Notices</h2>
            {notices.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="p-6 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active notices</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notices.map(n => (
                  <Card key={n.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="font-semibold text-sm">{n.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(n.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick Links */}
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-4">Quick Links</h2>
              <div className="space-y-2">
                {[
                  { href: "/notes", label: "My Notes", icon: BookOpen },
                  { href: "/tests", label: "Practice Tests", icon: ClipboardList },
                  { href: "/profile", label: "My Profile", icon: GraduationCap },
                ].map(l => (
                  <Link key={l.href} href={l.href}>
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <l.icon className="w-4 h-4 text-primary" />
                      {l.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
