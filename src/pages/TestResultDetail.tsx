import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

export default function TestResultDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [result, setResult] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      try {
        if (!params.id || (!user?.email && !user?.uid)) {
          setLoading(false);
          return;
        }

        const resultSnap = await getDoc(doc(db, "testResults", params.id));

        if (!resultSnap.exists()) {
          setResult(null);
          setLoading(false);
          return;
        }

        const resultData = {
          id: resultSnap.id,
          ...resultSnap.data(),
        } as any;

        const isOwner =
          (user?.uid && resultData.userUid === user.uid) ||
          (!resultData.userUid && user?.email && resultData.userEmail === user.email);

        if (!isOwner) {
          setResult(null);
          setLoading(false);
          return;
        }

        setResult(resultData);

        if (resultData.testId) {
          const testSnap = await getDoc(doc(db, "tests", resultData.testId));
          if (testSnap.exists()) {
            setTest({
              id: testSnap.id,
              ...testSnap.data(),
            });
          }
        }

        if (resultData.testId) {
          const qSnap = await getDocs(
            query(collection(db, "testQuestions"), where("testId", "==", resultData.testId))
          );

          const qList = qSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          qList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setQuestions(qList);
        }
      } catch (error) {
        console.error("Error loading result detail:", error);
        setResult(null);
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [params.id, user?.email, user?.uid]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading result...</p>
        </div>
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Result not found</p>
          <Link href="/tests">
            <Button className="mt-4">Back to Tests</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const answers = result.answers || {};
  const percentage = Number(result.percentage || 0);
  const passed = percentage >= 60;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/tests">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Tests
          </Button>
        </Link>

        <Card className={`border-2 mb-6 ${passed ? "border-green-500" : "border-orange-500"}`}>
          <CardContent className="p-8 text-center">
            <div
              className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${passed
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-orange-100 dark:bg-orange-900/30"
                }`}
            >
              {passed ? (
                <CheckCircle className="w-10 h-10 text-green-600" />
              ) : (
                <XCircle className="w-10 h-10 text-orange-500" />
              )}
            </div>

            <h1 className="text-3xl font-bold font-serif mb-2">
              {test?.title || result.testTitle || "Test Result"}
            </h1>

            <p className="text-muted-foreground mb-6">
              {result.createdAt?.toDate
                ? result.createdAt.toDate().toLocaleString("en-IN")
                : "Recently"}
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{result.score}</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{result.totalMarks}</p>
                <p className="text-xs text-muted-foreground">Total Marks</p>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <p
                  className={`text-2xl font-bold ${passed ? "text-green-600" : "text-orange-600"
                    }`}
                >
                  {percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Percentage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-xl font-bold">Answer Review</h2>

          {questions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Questions not found for this test
              </CardContent>
            </Card>
          ) : (
            questions.map((q: any, index: number) => {
              const selectedOption = answers[q.id] || null;
              const isCorrect = selectedOption === q.correctOption;

              return (
                <Card
                  key={q.id}
                  className={`border ${isCorrect
                    ? "border-green-200 dark:border-green-800"
                    : "border-red-200 dark:border-red-800"
                    }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <p className="font-medium text-sm mb-3">
                          {index + 1}. {q.text}
                        </p>

                        <div className="space-y-2 text-sm">
                          {["A", "B", "C", "D"].map((opt) => {
                            const text = q[`option${opt}`];
                            if (!text) return null;

                            const isSelected = selectedOption === opt;
                            const isAnswer = q.correctOption === opt;

                            return (
                              <div
                                key={opt}
                                className={`rounded-lg border px-3 py-2 ${isAnswer
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : isSelected
                                    ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                                    : "border-border"
                                  }`}
                              >
                                <span className="font-semibold mr-2">{opt}.</span>
                                {text}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 text-xs space-y-1">
                          <p className="text-muted-foreground">
                            Your answer:{" "}
                            <span
                              className={
                                isCorrect
                                  ? "text-green-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {selectedOption || "Not answered"}
                            </span>
                          </p>

                          {!isCorrect && (
                            <p className="text-muted-foreground">
                              Correct answer:{" "}
                              <span className="text-green-600 font-semibold">
                                {q.correctOption}
                              </span>
                            </p>
                          )}

                          {q.explanation && (
                            <p className="text-muted-foreground italic mt-2">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}