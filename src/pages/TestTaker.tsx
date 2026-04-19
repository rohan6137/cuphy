import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/useAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  CheckCircle,
  XCircle,
  BookOpen,
  Award,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";

type Phase = "instructions" | "taking" | "results";

export default function TestTaker() {
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const testId = params.id;

  const [phase, setPhase] = useState<Phase>("instructions");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [test, setTest] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isPremiumTest = test?.isPremium === true;

  const {
    hasAccess,
    loading: accessLoading,
    status,
  } = useAccess(test?.batchId, isPremiumTest);

  useEffect(() => {
    const loadTest = async () => {
      try {
        if (!testId) {
          setTest(null);
          return;
        }

        const testSnap = await getDoc(doc(db, "tests", testId));

        if (!testSnap.exists()) {
          setTest(null);
          return;
        }

        const testData = { id: testSnap.id, ...testSnap.data() } as any;

        if (testData.isVisible === false) {
          setTest(null);
          return;
        }

        setTest(testData);

        if (testData.batchId) {
          const batchSnap = await getDoc(doc(db, "batches", testData.batchId));
          if (batchSnap.exists()) {
            const batchData = {
              id: batchSnap.id,
              ...batchSnap.data(),
            } as any;
            setBatch(batchData);
          } else {
            setBatch(null);
          }
        } else {
          setBatch(null);
        }

        const qSnap = await getDocs(
          query(collection(db, "testQuestions"), where("testId", "==", testId))
        );

        const qList = qSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        qList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setQuestions(qList);
      } catch (error) {
        console.error("Error loading test:", error);
        toast({
          title: "Error",
          description: "Failed to load test",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId, toast]);

  useEffect(() => {
    if (test && phase === "taking") {
      setTimeLeft((test.durationMinutes || 30) * 60);
    }
  }, [test, phase]);

  useEffect(() => {
    if (phase !== "taking" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  const canTakeTest =
    !isPremiumTest ||
    (hasAccess && batch?.isActive !== false && batch?.isVisible !== false);

  const handleSubmit = async (autoSubmit = false) => {
    if (!test || questions.length === 0 || submitting) return;

    setSubmitting(true);

    try {
      if (!user?.uid) {
        throw new Error("You must be logged in to submit the test.");
      }

      let score = 0;
      let correctCount = 0;

      const details = questions.map((q: any) => {
        const userAnswer = answers[q.id] || null;
        const isCorrect = userAnswer === q.correctOption;

        if (isCorrect) {
          score += Number(q.marks || 1);
          correctCount += 1;
        }

        return {
          questionId: q.id,
          questionText: q.text || "",
          selectedOption: userAnswer,
          correctOption: q.correctOption || "",
          isCorrect,
          explanation: q.explanation || "",
          marks: Number(q.marks || 1),
        };
      });

      const totalMarks = questions.reduce(
        (sum: number, q: any) => sum + Number(q.marks || 1),
        0
      );

      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

      const payload = {
        testId: test.id,
        testTitle: test.title || "",

        userUid: user.uid || "",
        userPhone: user.phone || "",
        userEmail: user.email || "",
        userName: user.fullName || user.name || "",

        batchId: test.batchId || "",
        subjectId: test.subjectId || "",

        score,
        totalMarks,
        percentage,
        correctCount,
        totalQuestions: questions.length,

        answers,
        details,

        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "testResults"), payload);

      setResult({
        ...payload,
        createdAt: new Date(),
      });

      setPhase("results");

      toast({
        title: autoSubmit ? "Time Up!" : "Test Submitted",
        description: autoSubmit
          ? "Test submitted automatically."
          : "Your result has been saved.",
      });
    } catch (error: any) {
      console.error("Error submitting test:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit test",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || accessLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </Layout>
    );
  }

  if (!test) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Test not found</p>
          <Link href="/tests">
            <Button className="mt-4">Back to Tests</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (isPremiumTest && !canTakeTest) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link href="/tests">
            <Button variant="ghost" size="sm" className="mb-6 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>

          <Card className="border-border">
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Lock className="w-8 h-8 text-primary" />
              </div>

              <Badge className="mb-3">Premium Test</Badge>

              <h2 className="text-2xl font-bold mb-2">This test is locked</h2>

              <p className="text-muted-foreground mb-6">
                You need premium batch access to attempt this test.
              </p>

              {status === "login_required" || !isAuthenticated ? (
                <Link href="/login">
                  <Button size="lg">Login to Continue</Button>
                </Link>
              ) : test.batchId ? (
                <Link href={`/batches/${test.batchId}`}>
                  <Button size="lg">Unlock Premium</Button>
                </Link>
              ) : (
                <Button disabled size="lg">
                  Batch Not Available
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (phase === "instructions") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link href="/tests">
            <Button variant="ghost" size="sm" className="mb-6 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className="w-fit">MCQ Test</Badge>
                {isPremiumTest ? (
                  <Badge variant="secondary">Premium</Badge>
                ) : (
                  <Badge variant="outline">Free</Badge>
                )}
              </div>

              <CardTitle className="text-2xl font-serif">{test.title}</CardTitle>

              {test.description && (
                <p className="text-muted-foreground">{test.description}</p>
              )}
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  {
                    label: "Duration",
                    value: `${test.durationMinutes || 30} min`,
                    icon: Clock,
                  },
                  {
                    label: "Questions",
                    value: questions.length,
                    icon: BookOpen,
                  },
                  {
                    label: "Total Marks",
                    value: test.totalMarks || 0,
                    icon: Award,
                  },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-lg bg-muted">
                    <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                    <p className="font-semibold">Instructions</p>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs">
                      <li>Each question has 4 options. Select the correct one.</li>
                      <li>Timer starts when you begin. Auto-submit at time up.</li>
                      <li>Once submitted, answers cannot be changed.</li>
                      <li>Review all answers before submitting.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => setPhase("taking")}
              >
                Start Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (phase === "taking") {
    const q = questions[current];
    const progress = ((current + 1) / questions.length) * 100;
    const urgent = timeLeft < 60;

    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground font-medium">
              Question {current + 1} of {questions.length}
            </p>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${urgent
                ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                : "bg-muted text-foreground"
                }`}
            >
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>

          <Progress value={progress} className="h-2 mb-6" />

          {q && (
            <Card className="border-border mb-6">
              <CardContent className="p-6">
                <p className="text-lg font-semibold mb-6 leading-relaxed">
                  {current + 1}. {q.text}
                </p>

                <RadioGroup
                  value={answers[q.id] ?? ""}
                  onValueChange={(val) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: val }))
                  }
                  className="space-y-3"
                >
                  {["A", "B", "C", "D"].map((opt) => {
                    const text = q[`option${opt}`];
                    if (!text) return null;

                    return (
                      <div
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                          }`}
                      >
                        <RadioGroupItem value={opt} id={`opt-${q.id}-${opt}`} />
                        <Label
                          htmlFor={`opt-${q.id}-${opt}`}
                          className="cursor-pointer flex-1"
                        >
                          <span className="font-medium text-muted-foreground mr-2">
                            {opt}.
                          </span>
                          {text}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => c - 1)}
              disabled={current === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>

            <div className="flex gap-1 flex-wrap justify-center max-w-xs">
              {questions.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-colors ${idx === current
                    ? "bg-primary text-primary-foreground"
                    : answers[questions[idx]?.id]
                      ? "bg-green-200 text-green-800"
                      : "bg-muted text-muted-foreground"
                    }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => c + 1)} className="gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Submit
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  if (phase === "results" && result) {
    const pct = result.percentage ?? 0;
    const passed = pct >= 60;

    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <Card
            className={`border-2 mb-6 ${passed ? "border-green-500" : "border-orange-500"
              }`}
          >
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

              <h2 className="text-3xl font-bold font-serif mb-1">
                {passed ? "Well Done!" : "Keep Practicing!"}
              </h2>

              <p className="text-muted-foreground mb-6">
                You have completed {test.title}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-4">
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
                    {pct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.details && (
            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-lg">Answer Review</h3>

              {result.details.map((d: any, idx: number) => (
                <Card
                  key={d.questionId}
                  className={`border ${d.isCorrect
                    ? "border-green-200 dark:border-green-800"
                    : "border-red-200 dark:border-red-800"
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {d.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {idx + 1}. {d.questionText}
                        </p>

                        <div className="mt-2 text-xs space-y-1">
                          <p className="text-muted-foreground">
                            Your answer:{" "}
                            <span
                              className={
                                d.isCorrect
                                  ? "text-green-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {d.selectedOption ?? "Not answered"}
                            </span>
                          </p>

                          {!d.isCorrect && (
                            <p className="text-muted-foreground">
                              Correct:{" "}
                              <span className="text-green-600 font-semibold">
                                {d.correctOption}
                              </span>
                            </p>
                          )}

                          {d.explanation && (
                            <p className="text-muted-foreground italic mt-1">
                              {d.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/tests" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Tests
              </Button>
            </Link>

            <Button
              className="flex-1"
              onClick={() => {
                setPhase("instructions");
                setAnswers({});
                setCurrent(0);
                setResult(null);
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}