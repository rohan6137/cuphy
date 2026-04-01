import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote, useListBatches, useListSubjects } from "@workspace/api-client-react";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, FileText } from "lucide-react";

const emptyForm = { title: "", description: "", pdfUrl: "", batchId: "", subjectId: "", category: "Notes", isFree: false };

export default function AdminNotes() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [batchFilter, setBatchFilter] = useState("all");

  const { data: batchesData } = useListBatches({});
  const batches = batchesData?.batches ?? [];

  const { data: subjectsData } = useListSubjects({
    batchId: form.batchId ? parseInt(form.batchId) : undefined
  });
  const subjects = subjectsData?.subjects ?? [];

  const { data, isLoading, refetch } = useListNotes({
    batchId: batchFilter !== "all" ? parseInt(batchFilter) : undefined
  });
  const notes = data?.notes ?? [];

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (n: any) => {
    setEditing(n);
    setForm({
      title: n.title, description: n.description ?? "", pdfUrl: n.pdfUrl,
      batchId: String(n.batchId), subjectId: String(n.subjectId),
      category: n.category ?? "Notes", isFree: n.isFree
    });
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      title: form.title, description: form.description, pdfUrl: form.pdfUrl,
      batchId: parseInt(form.batchId), subjectId: parseInt(form.subjectId),
      category: form.category, isFree: form.isFree
    };

    if (editing) {
      updateNote.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast({ title: "Note updated!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    } else {
      createNote.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Note created!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteNote.mutate({ id }, {
      onSuccess: () => { toast({ title: "Note deleted" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const isPending = createNote.isPending || updateNote.isPending;

  return (
    <AdminLayout title="Notes Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Note
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{notes.length} notes</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3" />
            <p>No notes yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <Card key={n.id} className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      {n.category && <Badge variant="secondary" className="text-xs">{n.category}</Badge>}
                      {n.isFree && <Badge className="text-xs bg-green-100 text-green-700">Free</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{n.pdfUrl}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(n)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                          <AlertDialogDescription>Delete "{n.title}"?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(n.id)} className="bg-destructive">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Note title" />
            </div>
            <div className="space-y-1.5">
              <Label>PDF URL *</Label>
              <Input value={form.pdfUrl} onChange={e => setForm(p => ({ ...p, pdfUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Batch *</Label>
              <Select value={form.batchId} onValueChange={v => setForm(p => ({ ...p, batchId: v, subjectId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))} disabled={!form.batchId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Notes">Notes</SelectItem>
                  <SelectItem value="PYQ">Previous Year Questions</SelectItem>
                  <SelectItem value="Assignment">Assignment</SelectItem>
                  <SelectItem value="Formula Sheet">Formula Sheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Free Note</Label>
              <Switch checked={form.isFree} onCheckedChange={v => setForm(p => ({ ...p, isFree: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !form.title || !form.pdfUrl || !form.batchId || !form.subjectId}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
