import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, BookOpen } from "lucide-react";

const emptyForm = {
  subjectName: "",
  batchId: "",
  order: "1",
  isVisible: true,
  showLectures: true,
  showNotes: true,
  showPyq: true,
  showTests: true,
};

export default function AdminSubjects() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batchFilter, setBatchFilter] = useState("all");

  const fetchBatches = async () => {
    const snap = await getDocs(collection(db, "batches"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setBatches(list);
  };

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);

      let snap;
      if (batchFilter === "all") {
        snap = await getDocs(collection(db, "subjects"));
      } else {
        snap = await getDocs(
          query(collection(db, "subjects"), where("batchId", "==", batchFilter))
        );
      }

      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setSubjects(list);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load subjects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [batchFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (subject: any) => {
    setEditing(subject);
    setForm({
      subjectName: subject.subjectName || "",
      batchId: subject.batchId || "",
      order: String(subject.order || 1),
      isVisible: subject.isVisible ?? true,
      showLectures: subject.showLectures ?? true,
      showNotes: subject.showNotes ?? true,
      showPyq: subject.showPyq ?? true,
      showTests: subject.showTests ?? true,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        subjectName: form.subjectName,
        batchId: form.batchId,
        order: Number(form.order),
        isVisible: form.isVisible,
        showLectures: form.showLectures,
        showNotes: form.showNotes,
        showPyq: form.showPyq,
        showTests: form.showTests,
      };

      if (editing) {
        await updateDoc(doc(db, "subjects", editing.id), payload);
        toast({ title: "Subject updated!" });
      } else {
        await addDoc(collection(db, "subjects"), payload);
        toast({ title: "Subject created!" });
      }

      setOpen(false);
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subject",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "subjects", id));
      toast({ title: "Subject deleted" });
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subject",
        variant: "destructive",
      });
    }
  };

  const getBatchName = (batchId: string) => {
    const batch = batches.find((b: any) => b.id === batchId);
    return batch?.name || "Unknown Batch";
  };

  return (
    <AdminLayout title="Subject Management">
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

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" /> Add Subject
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Subject" : "Create Subject"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Subject Name *</Label>
                  <Input
                    value={form.subjectName}
                    onChange={(e) => setForm((p) => ({ ...p, subjectName: e.target.value }))}
                    placeholder="e.g. Mechanics"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Batch *</Label>
                  <Select value={form.batchId} onValueChange={(v) => setForm((p) => ({ ...p, batchId: v }))}>
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
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Visible</Label>
                  <Switch
                    checked={form.isVisible}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, isVisible: v }))}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Enable Sections</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Lectures</span>
                      <Switch
                        checked={form.showLectures}
                        onCheckedChange={(v) =>
                          setForm((p: any) => ({ ...p, showLectures: v }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Notes</span>
                      <Switch
                        checked={form.showNotes}
                        onCheckedChange={(v) =>
                          setForm((p: any) => ({ ...p, showNotes: v }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Previous Questions</span>
                      <Switch
                        checked={form.showPyq}
                        onCheckedChange={(v) =>
                          setForm((p: any) => ({ ...p, showPyq: v }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tests</span>
                      <Switch
                        checked={form.showTests}
                        onCheckedChange={(v) =>
                          setForm((p: any) => ({ ...p, showTests: v }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.subjectName || !form.batchId}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-sm text-muted-foreground">{subjects.length} subjects</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3" />
            <p>No subjects yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map((subject: any) => (
              <Card key={subject.id} className="border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{subject.subjectName}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{getBatchName(subject.batchId)}</span>
                      <span>Order: {subject.order}</span>
                      <span>{subject.isVisible ? "Visible" : "Hidden"}</span>
                    </div>
                    <div className="flex gap-2 text-xs mt-2 flex-wrap">
                      {subject.showLectures && <span className="px-2 py-1 rounded bg-muted">Lectures</span>}
                      {subject.showNotes && <span className="px-2 py-1 rounded bg-muted">Notes</span>}
                      {subject.showPyq && <span className="px-2 py-1 rounded bg-muted">PYQ</span>}
                      {subject.showTests && <span className="px-2 py-1 rounded bg-muted">Tests</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(subject)}>
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
                          <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{subject.subjectName}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(subject.id)} className="bg-destructive">
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
    </AdminLayout>
  );
}