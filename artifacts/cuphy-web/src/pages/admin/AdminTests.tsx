import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useListTests, useCreateTest, useUpdateTest, useDeleteTest, useListBatches, useGetTestById, getGetTestByIdQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, ClipboardList } from "lucide-react";
import { customFetch } from "@/lib/custom-fetch";
import { useQueryClient } from "@tanstack/react-query";

const emptyTestForm = { title: "", description: "", type: "quiz", batchId: "", totalMarks: "10", durationMinutes: "30", isActive: true };
const emptyQForm = { text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", explanation: "", marks: "2", order: "1" };

function QuestionsManager({ testId }: { testId: number }) {
  const { data, refetch } = useGetTestById(testId, { query: { queryKey: getGetTestByIdQueryKey(testId) } });
  const { toast } = useToast();
  const [qOpen, setQOpen] = useState(false);
  const [qLoading, setQLoading] = useState(false);
  const [qForm, setQForm] = useState({ ...emptyQForm });

  const questions = (data as any)?.questions ?? [];

  const handleAddQ = async () => {
    setQLoading(true);
    try {
      await customFetch(`/api/tests/${testId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          text: qForm.text, optionA: qForm.optionA, optionB: qForm.optionB,
          optionC: qForm.optionC, optionD: qForm.optionD,
          correctOption: qForm.correctOption,
          explanation: qForm.explanation || undefined,
          marks: parseInt(qForm.marks), order: parseInt(qForm.order)
        }),
      });
      toast({ title: "Question added!" });
      setQOpen(false);
      setQForm({ ...emptyQForm });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setQLoading(false);
    }
  };

  const handleDeleteQ = async (questionId: number) => {
    try {
      await customFetch(`/api/tests/${testId}/questions/${questionId}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{questions.length} questions</p>
        <Button size="sm" variant="outline" onClick={() => setQOpen(true)} className="gap-1 h-7 text-xs">
          <Plus className="w-3 h-3" /> Add Question
        </Button>
      </div>

      <div className="space-y-1.5">
        {questions.map((q: any, idx: number) => (
          <div key={q.id} className="flex items-start gap-2 p-2 rounded bg-muted text-sm">
            <span className="text-muted-foreground text-xs font-bold w-4 shrink-0 mt-0.5">{idx + 1}.</span>
            <p className="flex-1 text-xs">{q.text}</p>
            <Badge variant="secondary" className="text-xs shrink-0">Ans: {q.correctOption}</Badge>
            <button
              onClick={() => handleDeleteQ(q.id)}
              className="text-destructive hover:text-destructive/70 shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={qOpen} onOpenChange={setQOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Question Text *</Label>
              <Textarea value={qForm.text} onChange={e => setQForm(p => ({ ...p, text: e.target.value }))} rows={2} placeholder="Question..." />
            </div>
            {["A", "B", "C", "D"].map(opt => (
              <div key={opt} className="space-y-1">
                <Label className="text-xs">Option {opt} *</Label>
                <Input value={(qForm as any)[`option${opt}`]} onChange={e => setQForm(p => ({ ...p, [`option${opt}`]: e.target.value }))} placeholder={`Option ${opt}`} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Correct Option *</Label>
                <Select value={qForm.correctOption} onValueChange={v => setQForm(p => ({ ...p, correctOption: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A","B","C","D"].map(o => <SelectItem key={o} value={o}>Option {o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Marks</Label>
                <Input type="number" value={qForm.marks} onChange={e => setQForm(p => ({ ...p, marks: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Explanation</Label>
              <Textarea value={qForm.explanation} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} rows={1} placeholder="Optional explanation..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQOpen(false)}>Cancel</Button>
            <Button onClick={handleAddQ} disabled={qLoading || !qForm.text || !qForm.optionA || !qForm.optionB}>
              {qLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminTests() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyTestForm });
  const [batchFilter, setBatchFilter] = useState("all");

  const { data: batchesData } = useListBatches({});
  const batches = batchesData?.batches ?? [];

  const { data, isLoading, refetch } = useListTests({
    batchId: batchFilter !== "all" ? parseInt(batchFilter) : undefined
  });
  const tests = data?.tests ?? [];

  const createTest = useCreateTest();
  const updateTest = useUpdateTest();
  const deleteTest = useDeleteTest();

  const openCreate = () => { setEditing(null); setForm({ ...emptyTestForm }); setOpen(true); };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      title: t.title, description: t.description ?? "", type: t.type,
      batchId: String(t.batchId), totalMarks: String(t.totalMarks),
      durationMinutes: String(t.durationMinutes), isActive: t.isActive
    });
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      title: form.title, description: form.description, type: form.type as "test"|"quiz",
      batchId: parseInt(form.batchId), totalMarks: parseInt(form.totalMarks),
      durationMinutes: parseInt(form.durationMinutes), isActive: form.isActive
    };

    if (editing) {
      updateTest.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast({ title: "Test updated!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    } else {
      createTest.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Test created!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const isPending = createTest.isPending || updateTest.isPending;

  return (
    <AdminLayout title="Test Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2" data-testid="button-add-test">
            <Plus className="w-4 h-4" /> Add Test
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{tests.length} tests</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3" />
            <p>No tests yet</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {tests.map(t => (
              <AccordionItem key={t.id} value={String(t.id)} className="border rounded-xl px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.type === "quiz" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                      <ClipboardList className={`w-4 h-4 ${t.type === "quiz" ? "text-blue-600" : "text-orange-600"}`} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm truncate">{t.title}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="secondary" className="text-xs capitalize">{t.type}</Badge>
                        <span>{t.questionsCount} q • {t.totalMarks} marks • {t.durationMinutes}min</span>
                        {!t.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-auto">
                      <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(t); }} className="h-7 px-2">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:text-destructive" onClick={e => e.stopPropagation()}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Test?</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{t.title}" and all its questions?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTest.mutate({ id: t.id }, { onSuccess: () => { toast({ title: "Deleted" }); refetch(); } })} className="bg-destructive">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <QuestionsManager testId={t.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Test" : "Create Test"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Test title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Batch *</Label>
                <Select value={form.batchId} onValueChange={v => setForm(p => ({ ...p, batchId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration (min)</Label>
                <Input type="number" value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Marks</Label>
                <Input type="number" value={form.totalMarks} onChange={e => setForm(p => ({ ...p, totalMarks: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !form.title || !form.batchId}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
