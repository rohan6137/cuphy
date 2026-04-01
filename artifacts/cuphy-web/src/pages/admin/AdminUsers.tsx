import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useListUsers, useUpdateUser, useDeleteUser, useListBatches, useEnrollInBatch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Users, Edit, Trash2, Loader2, Search, BookOpen } from "lucide-react";

export default function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState<any>(null);
  const [enrollUserId, setEnrollUserId] = useState<number | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  const { data: usersData, isLoading, refetch } = useListUsers({
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter as "student" | "admin" : undefined,
  });
  const { data: batchesData } = useListBatches({ isActive: true });
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const enrollUser = useEnrollInBatch();

  const users = usersData?.users ?? [];
  const batches = batchesData?.batches ?? [];

  const [editForm, setEditForm] = useState({ name: "", email: "", semester: "", isActive: true, role: "student" });

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email ?? "", semester: u.semester ? String(u.semester) : "", isActive: u.isActive, role: u.role });
  };

  const handleUpdate = () => {
    updateUser.mutate({
      id: editUser.id,
      data: {
        name: editForm.name,
        email: editForm.email || undefined,
        semester: editForm.semester ? parseInt(editForm.semester) : undefined,
        isActive: editForm.isActive,
        role: editForm.role as "student" | "admin",
      }
    }, {
      onSuccess: () => { toast({ title: "User updated!" }); setEditUser(null); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteUser.mutate({ id }, {
      onSuccess: () => { toast({ title: "User deleted" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleEnroll = () => {
    if (!enrollUserId || !selectedBatch) return;
    enrollUser.mutate({ batchId: parseInt(selectedBatch), data: { userId: enrollUserId } }, {
      onSuccess: () => {
        toast({ title: "User enrolled!" });
        setEnrollUserId(null);
        setSelectedBatch("");
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
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
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-user-search"
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

        <p className="text-sm text-muted-foreground">{usersData?.total ?? 0} users total</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <Card key={user.id} className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{user.name}</p>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs capitalize">{user.role}</Badge>
                      {!user.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.phone} {user.email ? `• ${user.email}` : ""} {user.semester ? `• Sem ${user.semester}` : ""}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setEnrollUserId(user.id); setSelectedBatch(""); }} title="Enroll in batch">
                      <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(user)} data-testid={`button-edit-user-${user.id}`}>
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
                          <AlertDialogTitle>Delete User?</AlertDialogTitle>
                          <AlertDialogDescription>Permanently delete {user.name}?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive">Delete</AlertDialogAction>
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
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Semester</Label>
                <Select value={editForm.semester} onValueChange={v => setEditForm(p => ({ ...p, semester: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6].map(s => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Account Active</Label>
              <Switch checked={editForm.isActive} onCheckedChange={v => setEditForm(p => ({ ...p, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateUser.isPending}>
              {updateUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={!!enrollUserId} onOpenChange={v => !v && setEnrollUserId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enroll User in Batch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger><SelectValue placeholder="Choose batch..." /></SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name} (Sem {b.semester})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollUserId(null)}>Cancel</Button>
            <Button onClick={handleEnroll} disabled={!selectedBatch || enrollUser.isPending}>
              {enrollUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
