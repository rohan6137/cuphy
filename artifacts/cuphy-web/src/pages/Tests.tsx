import { useState } from "react";
import { Link } from "wouter";
import { useListTests, useGetMyBatches, getGetMyBatchesQueryKey, useGetMyTestResults, getGetMyTestResultsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Clock, BookOpen, CheckCircle, Award } from "lucide-react";

export default function Tests() {
  const [batchId, setBatchId] = useState<string>("all");
  const [type, setType] = useState<string>("all");

  const { data: myBatchesData } = useGetMyBatches({ query: { queryKey: getGetMyBatchesQueryKey() } });
  const myBatches = myBatchesData?.batches ?? [];

  const { data, isLoading } = useListTests({
    ...(batchId !== "all" ? { batchId: parseInt(batchId) } : {}),
    ...(type !== "all" ? { type: type as "test" | "quiz" } : {}),
  });

  const { data: resultsData } = useGetMyTestResults({ query: { queryKey: getGetMyTestResultsQueryKey() } });
  const results = resultsData?.results ?? [];
  const attemptedTestIds = new Set(results.map(r => r.testId));

  const tests = data?.tests ?? [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif">Tests & Quizzes</h1>
            <p className="text-muted-foreground mt-1">Practice with timed MCQ tests and quick quizzes</p>
          </div>
          <div className="flex gap-3">
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {myBatches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tests available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map(test => {
              const attempted = attemptedTestIds.has(test.id);
              const myResult = results.find(r => r.testId === test.id);
              return (
                <Card key={test.id} data-testid={`card-test-${test.id}`} className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${test.type === "quiz" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                      <ClipboardList className={`w-6 h-6 ${test.type === "quiz" ? "text-blue-600" : "text-orange-600"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-base">{test.title}</h3>
                        <Badge variant={test.type === "quiz" ? "secondary" : "default"} className="capitalize text-xs">
                          {test.type}
                        </Badge>
                        {attempted && (
                          <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                            <CheckCircle className="w-3 h-3" /> Attempted
                          </Badge>
                        )}
                      </div>
                      {test.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{test.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.durationMinutes} min</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{test.questionsCount} questions</span>
                        <span className="flex items-center gap-1"><Award className="w-3 h-3" />{test.totalMarks} marks</span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 shrink-0">
                      {myResult && (
                        <div className="text-right">
                          <p className="text-sm font-bold">{myResult.score}/{myResult.totalMarks}</p>
                          <p className={`text-xs ${myResult.percentage >= 60 ? 'text-green-600' : 'text-orange-600'}`}>
                            {myResult.percentage.toFixed(1)}%
                          </p>
                        </div>
                      )}
                      <Link href={`/tests/${test.id}`}>
                        <Button
                          size="sm"
                          variant={attempted ? "outline" : "default"}
                          data-testid={`button-attempt-test-${test.id}`}
                        >
                          {attempted ? "Re-attempt" : "Start Test"}
                        </Button>
                      </Link>
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
