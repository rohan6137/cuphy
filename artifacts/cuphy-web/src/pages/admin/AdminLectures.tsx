import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useListLectures, useCreateLecture, useUpdateLecture, useDeleteLecture, useListBatches, useListSubjects } from "@workspace/api-client-react";
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
import { Plus, Edit, Trash2, Loader2, PlayCircle, Clock, Lock } from "lucide-react";

const emptyForm = { title: "", description: "", youtubeVideoId: "", batchId: "", subjectId: "", duration: "", order: "1", isFree: false };

export default function AdminLectures() {
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

  const { data, isLoading, refetch } = useListLectures({
    batchId: batchFilter !== "all" ? parseInt(batchFilter) : undefined
  });
  const lectures = data?.lectures ?? [];

  const createLecture = useCreateLecture();
  const updateLecture = useUpdateLecture();
  const deleteLecture = useDeleteLecture();

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (l: any) => {
    setEditing(l);
    setForm({
      title: l.title, description: l.description ?? "", youtubeVideoId: l.youtubeVideoId,
      batchId: String(l.batchId), subjectId: String(l.subjectId), duration: l.duration ?? "",
      order: String(l.order), isFree: l.isFree
    });
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      title: form.title, description: form.description, youtubeVideoId: form.youtubeVideoId,
      batchId: parseInt(form.batchId), subjectId: parseInt(form.subjectId),
      duration: form.duration || undefined, order: parseInt(form.order), isFree: form.isFree
    };

    if (editing) {
      updateLecture.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast({ title: "Lecture updated!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    } else {
      createLecture.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Lecture created!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteLecture.mutate({ id }, {
      onSuccess: () => { toast({ title: "Lecture deleted" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const isPending = createLecture.isPending || updateLecture.isPending;

  return (
    <AdminLayout title="Lecture Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2" data-testid="button-add-lecture">
            <Plus className="w-4 h-4" /> Add Lecture
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{lectures.length} lectures</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : lectures.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <PlayCircle className="w-10 h-10 mx-auto mb-3" />
            <p>No lectures yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lectures.map(l => (
              <Card key={l.id} className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <img
                    src={`https://img.youtube.com/vi/${l.youtubeVideoId}/default.jpg`}
                    className="w-16 h-12 object-cover rounded-lg shrink-0"
                    alt={l.title}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm truncate">{l.title}</p>
                      {l.isFree ? (
                        <Badge className="text-xs bg-green-100 text-green-700">Free</Badge>
                      ) : (
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {l.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.duration}</span>}
                      <span>Order: {l.order}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
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
                          <AlertDialogTitle>Delete Lecture?</AlertDialogTitle>
                          <AlertDialogDescription>Permanently delete "{l.title}"?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(l.id)} className="bg-destructive">Delete</AlertDialogAction>
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
            <DialogTitle>{editing ? "Edit Lecture" : "Add Lecture"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Lecture title" data-testid="input-lecture-title" />
            </div>
            <div className="space-y-1.5">
              <Label>YouTube Video ID *</Label>
              <Input value={form.youtubeVideoId} onChange={e => setForm(p => ({ ...p, youtubeVideoId: e.target.value }))} placeholder="dQw4w9WgXcQ" />
              <p className="text-xs text-muted-foreground">The ID after v= in youtube.com/watch?v=...</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="1:15:00" />
              </div>
              <div className="space-y-1.5">
                <Label>Order</Label>
                <Input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Free Lecture</Label>
              <Switch checked={form.isFree} onCheckedChange={v => setForm(p => ({ ...p, isFree: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !form.title || !form.youtubeVideoId || !form.batchId || !form.subjectId} data-testid="button-save-lecture">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
