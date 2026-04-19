import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Users, Edit, Trash2, Loader2, Search, BookOpen } from "lucide-react";

export default function AdminUsers() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [editUser, setEditUser] = useState<any>(null);
  const [enrollUserId, setEnrollUserId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  const [editForm, setEditForm] = useState({
    name: "",
    fullName: "",
    email: "",
    phone: "",
    semester: "",
    isActive: true,
    role: "student",
  });

  const loadData = async () => {
    setLoading(true);

    try {
      const [userSnap, batchSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "batches")),
      ]);

      const userList = userSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      const batchList = batchSnap.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .filter((b: any) => b.isVisible !== false && b.isActive !== false)
        .sort((a: any, b: any) => (Number(a.semester || 0) - Number(b.semester || 0)));

      setUsers(userList);
      setBatches(batchList);
    } catch (error) {
      console.error("Error loading admin users:", error);
      setUsers([]);
      setBatches([]);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user: any) => {
      const matchesSearch =
        !search.trim() ||
        (user.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (user.phone || "").toLowerCase().includes(search.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "all" ? true : (user.role || "student") === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditForm({
      name: u.name || u.fullName || "",
      fullName: u.fullName || u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      semester: u.semester ? String(u.semester) : "",
      isActive: u.isActive !== false,
      role: u.role || "student",
    });
  };

  const handleUpdate = async () => {
    if (!editUser) return;

    setSaving(true);

    try {
      await updateDoc(doc(db, "users", editUser.id), {
        name: editForm.name.trim(),
        fullName: editForm.fullName.trim() || editForm.name.trim(),
        email: editForm.email.trim() || "",
        phone: editForm.phone.trim() || "",
        semester: editForm.semester ? Number(editForm.semester) : null,
        isActive: editForm.isActive,
        role: editForm.role,
        updatedAt: Timestamp.now(),
      });

      toast({ title: "User updated" });

      setEditUser(null);
      await loadData();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      await deleteDoc(doc(db, "users", id));

      toast({ title: "User deleted" });
      await loadData();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEnroll = async () => {
    if (!enrollUserId || !selectedBatch) return;

    setEnrolling(true);

    try {
      const userDoc = users.find((u: any) => u.id === enrollUserId);
      const batchDoc = batches.find((b: any) => b.id === selectedBatch);

      if (!userDoc || !batchDoc) {
        toast({
          title: "Error",
          description: "User or batch not found.",
          variant: "destructive",
        });
        return;
      }

      const enrollmentChecks = [];

      if (userDoc.id) {
        enrollmentChecks.push(
          getDocs(
            query(
              collection(db, "enrollments"),
              where("userUid", "==", userDoc.id),
              where("batchId", "==", selectedBatch)
            )
          )
        );
      }

      if (userDoc.email) {
        enrollmentChecks.push(
          getDocs(
            query(
              collection(db, "enrollments"),
              where("userEmail", "==", userDoc.email),
              where("batchId", "==", selectedBatch)
            )
          )
        );
      }

      const enrollmentResults = await Promise.all(enrollmentChecks);
      const alreadyEnrolled = enrollmentResults.some((snap) => !snap.empty);

      if (alreadyEnrolled) {
        toast({
          title: "Already enrolled",
          description: "This user is already enrolled in the selected batch.",
        });
        setEnrollUserId(null);
        setSelectedBatch("");
        return;
      }

      await addDoc(collection(db, "enrollments"), {
        userUid: userDoc.id || userDoc.uid || "",
        userPhone: userDoc.phone || "",
        userEmail: userDoc.email || "",
        userName: userDoc.fullName || userDoc.name || "",

        batchId: selectedBatch,
        batchName: batchDoc.batchName || batchDoc.name || "",
        semester: batchDoc.semester || "",

        isActive: true,
        createdAt: Timestamp.now(),
        enrolledAt: Timestamp.now(),
        addedByAdmin: true,
      });

      toast({ title: "User enrolled successfully" });
      setEnrollUserId(null);
      setSelectedBatch("");
    } catch (error: any) {
      console.error("Error enrolling user:", error);
      toast({
        title: "Error",
        description: "Failed to enroll user.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <AdminLayout title="User Management">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredUsers.length} users shown
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user: any) => (
              <Card key={user.id} className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {(user.fullName || user.name || "U").charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">
                        {user.fullName || user.name || "Unnamed User"}
                      </p>
                      <Badge
                        variant={(user.role || "student") === "admin" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {user.role || "student"}
                      </Badge>
                      {user.isActive === false && (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {user.phone || "No phone"}
                      {user.email ? ` • ${user.email}` : ""}
                      {user.semester ? ` • Sem ${user.semester}` : ""}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEnrollUserId(user.id);
                        setSelectedBatch("");
                      }}
                      title="Enroll in batch"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(user)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Permanently delete {user.name || "this user"}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(user.id)}
                            className="bg-destructive"
                            disabled={deletingId === user.id}
                          >
                            {deletingId === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
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

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Semester</Label>
                <Select
                  value={editForm.semester}
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, semester: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Sem {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, role: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Account Active</Label>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(v) =>
                  setEditForm((p) => ({ ...p, isActive: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>

            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={!!enrollUserId} onOpenChange={(v) => !v && setEnrollUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll User in Batch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose batch..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.batchName || b.name || "Unnamed Batch"} (Sem {b.semester || "-"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollUserId(null)}>
              Cancel
            </Button>

            <Button onClick={handleEnroll} disabled={!selectedBatch || enrolling}>
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}