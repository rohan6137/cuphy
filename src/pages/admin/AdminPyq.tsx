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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Edit,
  Trash2,
  Loader2,
  FileQuestion,
  Eye,
  EyeOff,
  Lock,
  Globe,
} from "lucide-react";

const emptyForm = {
  title: "",
  description: "",
  fileUrl: "",
  batchId: "",
  subjectId: "",
  year: "",
  order: "1",
  isVisible: true,
  isPremium: false,
};

export default function AdminPyq() {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ ...emptyForm });

  const [pyqs, setPyqs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [batchFilter, setBatchFilter] = useState("all");

  const filteredSubjects = useMemo(() => {
    if (!form.batchId) return [];
    return subjects.filter((subject) => subject.batchId === form.batchId);
  }, [subjects, form.batchId]);

  const fetchBatches = async () => {
    const snap = await getDocs(query(collection(db, "batches")));
    const list = snap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));
    setBatches(list);
  };

  const fetchSubjects = async () => {
    const snap = await getDocs(query(collection(db, "subjects")));
    const list = snap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));
    setSubjects(list);
  };

  const fetchPyqs = async () => {
    let pyqQuery;

    if (batchFilter !== "all") {
      pyqQuery = query(
        collection(db, "pyqs"),
        where("batchId", "==", batchFilter)
      );
    } else {
      pyqQuery = query(collection(db, "pyqs"));
    }

    const snap = await getDocs(pyqQuery);

    const list = snap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));

    list.sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title || "").localeCompare(b.title || "");
    });

    setPyqs(list);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBatches(), fetchSubjects(), fetchPyqs()]);
    } catch (error) {
      console.error("Error loading PYQ admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load previous questions data",
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
    setForm({ ...emptyForm });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      fileUrl: item.fileUrl || "",
      batchId: item.batchId || "",
      subjectId: item.subjectId || "",
      year: item.year || "",
      order: String(item.order || 1),
      isVisible: item.isVisible !== false,
      isPremium: !!item.isPremium,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.fileUrl || !form.batchId || !form.subjectId) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      fileUrl: form.fileUrl.trim(),
      batchId: form.batchId,
      subjectId: form.subjectId,
      year: form.year.trim(),
      order: Number(form.order) || 1,
      isVisible: form.isVisible,
      isPremium: form.isPremium,
      updatedAt: new Date(),
    };

    setSaving(true);

    try {
      if (editing) {
        await updateDoc(doc(db, "pyqs", editing.id), payload);
        toast({
          title: "PYQ updated",
          description: "The previous question has been updated successfully",
        });
      } else {
        await addDoc(collection(db, "pyqs"), {
          ...payload,
          createdAt: new Date(),
        });
        toast({
          title: "PYQ created",
          description: "The previous question has been added successfully",
        });
      }

      setOpen(false);
      resetForm();
      await fetchPyqs();
    } catch (error) {
      console.error("Error saving PYQ:", error);
      toast({
        title: "Error",
        description: "Failed to save previous question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "pyqs", id));
      toast({
        title: "PYQ deleted",
        description: "The previous question has been removed successfully",
      });
      await fetchPyqs();
    } catch (error) {
      console.error("Error deleting PYQ:", error);
      toast({
        title: "Error",
        description: "Failed to delete previous question",
        variant: "destructive",
      });
    }
  };

  const getBatchName = (batchId) => {
    const batch = batches.find((item) => item.id === batchId);
    return batch?.name || batch?.batchName || "Unknown Batch";
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find((item) => item.id === subjectId);
    return subject?.subjectName || subject?.name || "Unknown Subject";
  };

  return (
    <AdminLayout title="Previous Questions Management">
      <div className="space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Filter by batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name || batch.batchName || "Unnamed Batch"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add PYQ
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {pyqs.length} previous question{pyqs.length !== 1 ? "s" : ""}
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 bg-muted rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : pyqs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border rounded-3xl bg-card">
            <FileQuestion className="w-10 h-10 mx-auto mb-3" />
            <p>No previous questions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pyqs.map((item) => (
              <Card key={item.id} className="border-border shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileQuestion className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-semibold text-base truncate">
                        {item.title}
                      </p>

                      <Badge variant="outline">
                        Order {item.order || 1}
                      </Badge>

                      {item.year ? (
                        <Badge variant="outline">{item.year}</Badge>
                      ) : null}

                      {item.isPremium ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="w-3 h-3" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                          <Globe className="w-3 h-3" />
                          Free
                        </Badge>
                      )}

                      {item.isVisible !== false ? (
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

                    <p className="text-sm text-muted-foreground mb-1">
                      {getBatchName(item.batchId)} • {getSubjectName(item.subjectId)}
                    </p>

                    {item.description ? (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    ) : null}

                    <p className="text-xs text-muted-foreground truncate">
                      {item.fileUrl}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete PYQ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{item.title}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-destructive"
                          >
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

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetForm();
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit PYQ" : "Add PYQ"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter previous question title"
              />
            </div>

            <div className="space-y-1.5">
              <Label>File URL *</Label>
              <Input
                value={form.fileUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fileUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                placeholder="Short description"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                value={form.year}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, year: e.target.value }))
                }
                placeholder="e.g. 2023 / 2024 / Semester Exam"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Batch *</Label>
              <Select
                value={form.batchId}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    batchId: value,
                    subjectId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name || batch.batchName || "Unnamed Batch"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select
                value={form.subjectId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, subjectId: value }))
                }
                disabled={!form.batchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.subjectName || subject.name || "Unnamed Subject"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Order</Label>
              <Input
                type="number"
                min="1"
                value={form.order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, order: e.target.value }))
                }
                placeholder="1"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label className="block mb-1">Visible to students</Label>
                <p className="text-xs text-muted-foreground">
                  Hide this PYQ without deleting it
                </p>
              </div>
              <Switch
                checked={form.isVisible}
                onCheckedChange={(value) =>
                  setForm((prev) => ({ ...prev, isVisible: value }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label className="block mb-1">Premium PYQ</Label>
                <p className="text-xs text-muted-foreground">
                  Turn on if only paid students should access it
                </p>
              </div>
              <Switch
                checked={form.isPremium}
                onCheckedChange={(value) =>
                  setForm((prev) => ({ ...prev, isPremium: value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.title ||
                !form.fileUrl ||
                !form.batchId ||
                !form.subjectId
              }
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editing ? "Update PYQ" : "Create PYQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}