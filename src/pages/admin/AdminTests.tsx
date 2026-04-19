import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Loader2,
  Lock,
  Globe,
  Eye,
  EyeOff,
  ClipboardList,
  Edit,
} from "lucide-react";

const emptyTestForm = {
  title: "",
  description: "",
  batchId: "",
  subjectId: "",
  durationMinutes: "30",
  totalMarks: "10",
  order: "1",
  isVisible: true,
  isPremium: false,
};

const emptyQuestionForm = {
  text: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  explanation: "",
  marks: "1",
};

function TestQuestionsBlock({ testId }: { testId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyQuestionForm });

  const loadQuestions = async () => {
    const snap = await getDocs(
      query(collection(db, "testQuestions"), where("testId", "==", testId))
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setQuestions(list);
  };

  useEffect(() => {
    loadQuestions();
  }, [testId]);

  const resetForm = () => {
    setForm({ ...emptyQuestionForm });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (q: any) => {
    setEditing(q);
    setForm({
      text: q.text || "",
      optionA: q.optionA || "",
      optionB: q.optionB || "",
      optionC: q.optionC || "",
      optionD: q.optionD || "",
      correctOption: q.correctOption || "A",
      explanation: q.explanation || "",
      marks: String(q.marks || 1),
    });
    setOpen(true);
  };

  const saveQuestion = async () => {
    if (
      !form.text ||
      !form.optionA ||
      !form.optionB ||
      !form.optionC ||
      !form.optionD
    ) {
      toast({
        title: "Missing fields",
        description: "Fill all question fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const payload = {
      text: form.text.trim(),
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      optionC: form.optionC.trim(),
      optionD: form.optionD.trim(),
      correctOption: form.correctOption,
      explanation: form.explanation.trim(),
      marks: Number(form.marks) || 1,
      updatedAt: new Date(),
    };

    try {
      if (editing) {
        await updateDoc(doc(db, "testQuestions", editing.id), payload);
        toast({ title: "Question updated" });
      } else {
        await addDoc(collection(db, "testQuestions"), {
          testId,
          ...payload,
          createdAt: new Date(),
        });
        toast({ title: "Question added" });
      }

      setOpen(false);
      resetForm();
      await loadQuestions();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, "testQuestions", id));
      toast({ title: "Question deleted" });
      await loadQuestions();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-dashed p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Questions</div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions added yet.</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q: any, i: number) => (
            <div
              key={q.id}
              className="rounded-lg border p-3 flex gap-3 items-start bg-white dark:bg-transparent"
            >
              <div className="font-semibold text-sm">{i + 1}.</div>

              <div className="flex-1">
                <p className="text-sm font-medium">{q.text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Correct: {q.correctOption} • Marks: {q.marks || 1}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(q)}
                >
                  Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteQuestion(q.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              placeholder="Question"
              value={form.text}
              onChange={(e) =>
                setForm((p) => ({ ...p, text: e.target.value }))
              }
            />

            <Input
              placeholder="Option A"
              value={form.optionA}
              onChange={(e) =>
                setForm((p) => ({ ...p, optionA: e.target.value }))
              }
            />

            <Input
              placeholder="Option B"
              value={form.optionB}
              onChange={(e) =>
                setForm((p) => ({ ...p, optionB: e.target.value }))
              }
            />

            <Input
              placeholder="Option C"
              value={form.optionC}
              onChange={(e) =>
                setForm((p) => ({ ...p, optionC: e.target.value }))
              }
            />

            <Input
              placeholder="Option D"
              value={form.optionD}
              onChange={(e) =>
                setForm((p) => ({ ...p, optionD: e.target.value }))
              }
            />

            <Select
              value={form.correctOption}
              onValueChange={(value) =>
                setForm((p) => ({ ...p, correctOption: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Marks"
              value={form.marks}
              onChange={(e) =>
                setForm((p) => ({ ...p, marks: e.target.value }))
              }
            />

            <Textarea
              placeholder="Explanation"
              value={form.explanation}
              onChange={(e) =>
                setForm((p) => ({ ...p, explanation: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuestion} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update Question" : "Save Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminTests() {
  const { toast } = useToast();
  const [tests, setTests] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [batchFilter, setBatchFilter] = useState("all");
  const [form, setForm] = useState({ ...emptyTestForm });

  const filteredSubjects = useMemo(() => {
    if (!form.batchId) return [];
    return subjects.filter((s: any) => s.batchId === form.batchId);
  }, [subjects, form.batchId]);

  const loadBatches = async () => {
    const snap = await getDocs(collection(db, "batches"));
    setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadSubjects = async () => {
    const snap = await getDocs(collection(db, "subjects"));
    setSubjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const loadTests = async () => {
    const q1 =
      batchFilter === "all"
        ? query(collection(db, "tests"))
        : query(collection(db, "tests"), where("batchId", "==", batchFilter));

    const snap = await getDocs(q1);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    setTests(list);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadBatches(), loadSubjects(), loadTests()]);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load tests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [batchFilter]);

  const resetForm = () => {
    setForm({ ...emptyTestForm });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (test: any) => {
    setEditing(test);
    setForm({
      title: test.title || "",
      description: test.description || "",
      batchId: test.batchId || "",
      subjectId: test.subjectId || "",
      durationMinutes: String(test.durationMinutes || 30),
      totalMarks: String(test.totalMarks || 10),
      order: String(test.order || 1),
      isVisible: test.isVisible !== false,
      isPremium: test.isPremium === true,
    });
    setOpen(true);
  };

  const saveTest = async () => {
    if (!form.title || !form.batchId || !form.subjectId) {
      toast({
        title: "Missing fields",
        description: "Fill title, batch and subject",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      batchId: form.batchId,
      subjectId: form.subjectId,
      durationMinutes: Number(form.durationMinutes) || 30,
      totalMarks: Number(form.totalMarks) || 10,
      order: Number(form.order) || 1,
      isVisible: form.isVisible,
      isPremium: form.isPremium,
      updatedAt: new Date(),
    };

    try {
      if (editing) {
        await updateDoc(doc(db, "tests", editing.id), payload);
        toast({ title: "Test updated" });
      } else {
        await addDoc(collection(db, "tests"), {
          ...payload,
          createdAt: new Date(),
        });
        toast({ title: "Test created" });
      }

      setOpen(false);
      resetForm();
      await loadTests();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save test",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteTest = async (testId: string) => {
    try {
      const qSnap = await getDocs(
        query(collection(db, "testQuestions"), where("testId", "==", testId))
      );

      await Promise.all(qSnap.docs.map((q) => deleteDoc(doc(db, "testQuestions", q.id))));
      await deleteDoc(doc(db, "tests", testId));

      toast({ title: "Test deleted" });
      await loadTests();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete test",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="Test Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name || b.batchName || "Unnamed Batch"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Test
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : tests.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center text-muted-foreground">
            No tests yet
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test: any) => (
              <Card key={test.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{test.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {test.description || "No description"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline">
                          <ClipboardList className="w-3 h-3 mr-1" />
                          {test.totalMarks || 0} marks
                        </Badge>
                        <Badge variant="outline">
                          {test.durationMinutes || 0} min
                        </Badge>
                        {test.isPremium === true ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="w-3 h-3" />
                            Premium
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Globe className="w-3 h-3" />
                            Free
                          </Badge>
                        )}
                        {test.isVisible !== false ? (
                          <Badge variant="outline" className="gap-1">
                            <Eye className="w-3 h-3" />
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <EyeOff className="w-3 h-3" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => openEdit(test)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Test
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this test?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the test and all its questions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTest(test.id)}
                              className="bg-destructive"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <TestQuestionsBlock testId={test.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Test" : "Create Test"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div>
              <Label>Batch *</Label>
              <Select
                value={form.batchId}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, batchId: value, subjectId: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name || b.batchName || "Unnamed Batch"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject *</Label>
              <Select
                value={form.subjectId}
                onValueChange={(value) => setForm((p) => ({ ...p, subjectId: value }))}
                disabled={!form.batchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.subjectName || s.name || "Unnamed Subject"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration</Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                />
              </div>
              <div>
                <Label>Total Marks</Label>
                <Input
                  type="number"
                  value={form.totalMarks}
                  onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Order</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label className="block mb-1">Visible to students</Label>
                <p className="text-xs text-muted-foreground">
                  Hide this test without deleting it
                </p>
              </div>
              <Switch
                checked={form.isVisible}
                onCheckedChange={(value) => setForm((p) => ({ ...p, isVisible: value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label className="block mb-1">Premium Test</Label>
                <p className="text-xs text-muted-foreground">
                  Turn on if only paid students should access it
                </p>
              </div>
              <Switch
                checked={form.isPremium}
                onCheckedChange={(value) => setForm((p) => ({ ...p, isPremium: value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTest} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update Test" : "Create Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}