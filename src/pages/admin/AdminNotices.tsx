import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
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
import { Plus, Edit, Trash2, Loader2, Bell, Eye, EyeOff } from "lucide-react";

const emptyForm = {
  title: "",
  message: "",
  isVisible: true,
  order: "1",
};

export default function AdminNotices() {
  const { toast } = useToast();

  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({ ...emptyForm });

  const loadNotices = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")));
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      list.sort((a, b) => {
        const orderA = Number(a.order || 0);
        const orderB = Number(b.order || 0);
        if (orderA !== orderB) return orderA - orderB;

        const aTime =
          typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
        const bTime =
          typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      setNotices(list);
    } catch (error) {
      console.error("Failed to load notices:", error);
      setNotices([]);
      toast({
        title: "Error",
        description: "Failed to load notices.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (notice: any) => {
    setEditing(notice);
    setForm({
      title: notice.title || "",
      message: notice.message || "",
      isVisible: notice.isVisible !== false,
      order: String(notice.order || 1),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter both title and message.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        isVisible: form.isVisible,
        order: Number(form.order) || 1,
        updatedAt: serverTimestamp(),
      };

      if (editing) {
        await updateDoc(doc(db, "notices", editing.id), payload);
        toast({
          title: "Notice updated",
          description: "Home notice updated successfully.",
        });
      } else {
        await addDoc(collection(db, "notices"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({
          title: "Notice created",
          description: "Home notice added successfully.",
        });
      }

      setOpen(false);
      resetForm();
      await loadNotices();
    } catch (error) {
      console.error("Failed to save notice:", error);
      toast({
        title: "Error",
        description: "Failed to save notice.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (notice: any) => {
    try {
      await updateDoc(doc(db, "notices", notice.id), {
        isVisible: notice.isVisible === false,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: notice.isVisible === false ? "Notice shown" : "Notice hidden",
      });

      await loadNotices();
    } catch (error) {
      console.error("Failed to toggle notice visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update notice visibility.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notices", id));
      toast({
        title: "Notice deleted",
      });
      await loadNotices();
    } catch (error) {
      console.error("Failed to delete notice:", error);
      toast({
        title: "Error",
        description: "Failed to delete notice.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="Notices Management">
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Manage moving-text notices visible on the home page
          </p>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Notice
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3" />
              No notices found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notices.map((notice: any) => (
              <Card key={notice.id}>
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-semibold">{notice.title || "Untitled Notice"}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          notice.isVisible === false
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {notice.isVisible === false ? "Hidden" : "Visible"}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        Order {notice.order || 1}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {notice.message || "No message"}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleVisibility(notice)}
                      title={notice.isVisible === false ? "Show notice" : "Hide notice"}
                    >
                      {notice.isVisible === false ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(notice)}
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
                          <AlertDialogTitle>Delete notice?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the notice from the home page.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(notice.id)}
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

        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) resetForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Notice" : "Create Notice"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Notice Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Important Update"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notice Message</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  rows={5}
                  placeholder="This text will appear in the moving notice area on the home page."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, order: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Visible on Home Page</Label>
                <Switch
                  checked={form.isVisible}
                  onCheckedChange={(value) =>
                    setForm((prev) => ({ ...prev, isVisible: value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editing ? "Update Notice" : "Create Notice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}