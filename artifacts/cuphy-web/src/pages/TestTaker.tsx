import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useGetTestById, getGetTestByIdQueryKey, useSubmitTest } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, CheckCircle, XCircle, BookOpen, Award, ArrowLeft,
  ArrowRight, AlertTriangle, Loader2
} from "lucide-react";
import { Link } from "wouter";

type Phase = "instructions" | "taking" | "results";

export default function TestTaker() {
  const params = useParams<{ id: string }>();
  const testId = parseInt(params.id);
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("instructions");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: testData, isLoading: testLoading } = useGetTestById(testId, {
    query: { enabled: !!testId, queryKey: getGetTestByIdQueryKey(testId) }
  });
  const submitTest = useSubmitTest();

  const test = testData;
  const questions = (testData as any)?.questions ?? [];

  useEffect(() => {
    if (test && phase === "taking") {
      setTimeLeft(test.durationMinutes * 60);
    }
  }, [test, phase]);

  useEffect(() => {
    if (phase === "taking" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const handleSubmit = async (autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const answersPayload = Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId: parseInt(questionId),
      selectedOption,
    }));

    submitTest.mutate({ testId, data: { answers: answersPayload } }, {
      onSuccess: (res: any) => {
        const details = questions.map((q: any) => {
          const userAnswer = answers[q.id];
          return {
            questionId: q.id,
            questionText: q.text,
            selectedOption: userAnswer ?? null,
            correctOption: q.correctOption,
            isCorrect: userAnswer === q.correctOption,
            explanation: q.explanation,
          };
        });
        setResult({ ...res, details });
        setPhase("results");
        if (autoSubmit) toast({ title: "Time Up!", description: "Test submitted automatically" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (testLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (!test) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Test not found</p>
          <Link href="/tests"><Button className="mt-4">Back to Tests</Button></Link>
        </div>
      </Layout>
    );
  }

  // Instructions phase
  if (phase === "instructions") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link href="/tests">
            <Button variant="ghost" size="sm" className="mb-6 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Tests
            </Button>
          </Link>
          <Card className="border-border">
            <CardHeader>
              <Badge className="w-fit capitalize mb-2">{test.type}</Badge>
              <CardTitle className="text-2xl font-serif">{test.title}</CardTitle>
              {test.description && <p className="text-muted-foreground">{test.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Duration", value: `${test.durationMinutes} min`, icon: Clock },
                  { label: "Questions", value: test.questionsCount, icon: BookOpen },
                  { label: "Total Marks", value: test.totalMarks, icon: Award },
                ].map(s => (
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
                data-testid="button-start-test"
              >
                Start Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Taking phase
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
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${urgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 'bg-muted text-foreground'}`}>
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
                  onValueChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                  className="space-y-3"
                >
                  {["A", "B", "C", "D"].map(opt => {
                    const text = q[`option${opt}`] as string;
                    if (!text) return null;
                    return (
                      <div key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
                        <RadioGroupItem value={opt} id={`opt-${opt}`} data-testid={`option-${opt}`} />
                        <Label htmlFor={`opt-${opt}`} className="cursor-pointer flex-1">
                          <span className="font-medium text-muted-foreground mr-2">{opt}.</span>
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
              onClick={() => setCurrent(c => c - 1)}
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
                  className={`w-7 h-7 rounded text-xs font-bold transition-colors ${idx === current ? 'bg-primary text-primary-foreground' : answers[questions[idx]?.id] ? 'bg-green-200 text-green-800' : 'bg-muted text-muted-foreground'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent(c => c + 1)} className="gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitTest.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
                data-testid="button-submit-test"
              >
                {submitTest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Submit
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Results phase
  if (phase === "results" && result) {
    const pct = result.percentage ?? 0;
    const passed = pct >= 60;

    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <Card className={`border-2 mb-6 ${passed ? 'border-green-500' : 'border-orange-500'}`}>
            <CardContent className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                {passed ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-orange-500" />
                )}
              </div>
              <h2 className="text-3xl font-bold font-serif mb-1">
                {passed ? "Well Done!" : "Keep Practicing!"}
              </h2>
              <p className="text-muted-foreground mb-6">You have completed {test.title}</p>

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
                  <p className={`text-2xl font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}>
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
                <Card key={d.questionId} className={`border ${d.isCorrect ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {d.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{idx + 1}. {d.questionText}</p>
                        <div className="mt-2 text-xs space-y-1">
                          <p className="text-muted-foreground">Your answer: <span className={d.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{d.selectedOption ?? "Not answered"}</span></p>
                          {!d.isCorrect && (
                            <p className="text-muted-foreground">Correct: <span className="text-green-600 font-semibold">{d.correctOption}</span></p>
                          )}
                          {d.explanation && (
                            <p className="text-muted-foreground italic mt-1">{d.explanation}</p>
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
              <Button variant="outline" className="w-full">Back to Tests</Button>
            </Link>
            <Button className="flex-1" onClick={() => { setPhase("instructions"); setAnswers({}); setCurrent(0); }}>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}
