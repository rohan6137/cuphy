import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

const emptyForm = {
  title: "",
  description: "",
  youtubeVideoId: "",
  batchId: "",
  subjectId: "",
  duration: "",
  order: "1",
  isFree: false,
};

export default function AdminLectures() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [batchFilter, setBatchFilter] = useState("all");

  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBatches = async () => {
    const snap = await getDocs(collection(db, "batches"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setBatches(list);
  };

  const fetchSubjects = async (batchId?: string) => {
    try {
      let snap;
      if (batchId) {
        snap = await getDocs(
          query(collection(db, "subjects"), where("batchId", "==", batchId))
        );
      } else {
        snap = await getDocs(collection(db, "subjects"));
      }

      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setSubjects(list);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLectures = async () => {
    try {
      setIsLoading(true);

      let snap;
      if (batchFilter === "all") {
        snap = await getDocs(collection(db, "lectures"));
      } else {
        snap = await getDocs(
          query(collection(db, "lectures"), where("batchId", "==", batchFilter))
        );
      }

      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setLectures(list);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load lectures",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchLectures();
  }, [batchFilter]);

  useEffect(() => {
    if (form.batchId) {
      fetchSubjects(form.batchId);
    }
  }, [form.batchId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    fetchSubjects();
    setOpen(true);
  };

  const openEdit = (l: any) => {
    setEditing(l);
    setForm({
      title: l.title || "",
      description: l.description || "",
      youtubeVideoId: l.youtubeVideoId || "",
      batchId: l.batchId || "",
      subjectId: l.subjectId || "",
      duration: l.duration || "",
      order: String(l.order || 1),
      isFree: l.isFree ?? false,
    });
    fetchSubjects(l.batchId);
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        title: form.title,
        description: form.description,
        youtubeVideoId: form.youtubeVideoId,
        batchId: form.batchId,
        subjectId: form.subjectId,
        duration: form.duration || "",
        order: Number(form.order),
        isFree: form.isFree,
      };

      if (editing) {
        await updateDoc(doc(db, "lectures", editing.id), payload);
        toast({ title: "Lecture updated!" });
      } else {
        await addDoc(collection(db, "lectures"), payload);
        toast({ title: "Lecture created!" });
      }

      setOpen(false);
      fetchLectures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save lecture",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "lectures", id));
      toast({ title: "Lecture deleted" });
      fetchLectures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lecture",
        variant: "destructive",
      });
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s: any) => s.id === subjectId);
    return subject?.subjectName || "Unknown Subject";
  };

  return (
    <AdminLayout title="Lecture Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Lecture
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{lectures.length} lectures</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : lectures.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <PlayCircle className="w-10 h-10 mx-auto mb-3" />
            <p>No lectures yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lectures.map((l: any) => (
              <Card key={l.id} className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <img
                    src={`https://img.youtube.com/vi/${l.youtubeVideoId}/hqdefault.jpg`}
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

                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {l.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {l.duration}
                        </span>
                      )}
                      <span>{getSubjectName(l.subjectId)}</span>
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
                          <AlertDialogDescription>
                            Permanently delete "{l.title}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(l.id)} className="bg-destructive">
                            Delete
                          </AlertDialogAction>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Lecture" : "Add Lecture"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Lecture title"
              />
            </div>

            <div className="space-y-1.5">
              <Label>YouTube Video ID *</Label>
              <Input
                value={form.youtubeVideoId}
                onChange={(e) => setForm((p) => ({ ...p, youtubeVideoId: e.target.value }))}
                placeholder="dQw4w9WgXcQ"
              />
              <p className="text-xs text-muted-foreground">
                The ID after v= in youtube.com/watch?v=...
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Batch *</Label>
              <Select
                value={form.batchId}
                onValueChange={(v) => setForm((p) => ({ ...p, batchId: v, subjectId: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select
                value={form.subjectId}
                onValueChange={(v) => setForm((p) => ({ ...p, subjectId: v }))}
                disabled={!form.batchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input
                  value={form.duration}
                  onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                  placeholder="1:15:00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Free Lecture</Label>
              <Switch
                checked={form.isFree}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isFree: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.youtubeVideoId || !form.batchId || !form.subjectId}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}