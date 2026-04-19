import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, ShieldCheck, Edit } from "lucide-react";

export default function AdminSubscriptions() {
  const { toast } = useToast();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [active, setActive] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [expiryDate, setExpiryDate] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [subSnap, userSnap, batchSnap] = await Promise.all([
        getDocs(collection(db, "subscriptions")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "batches")),
      ]);

      const subList = subSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      subList.sort((a, b) => {
        const aEmail = a.userEmail || "";
        const bEmail = b.userEmail || "";
        return aEmail.localeCompare(bEmail);
      });

      setSubscriptions(subList);

      setUsers(
        userSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

      setBatches(
        batchSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedBatchId("");
    setActive(true);
    setPaymentStatus("paid");
    setExpiryDate("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (sub: any) => {
    setEditing(sub);
    const matchedUser = users.find(
      (u: any) =>
        u.id === sub.userUid ||
        (sub.userEmail && u.email === sub.userEmail)
    );

    setSelectedUserId(matchedUser?.id || sub.userUid || "");
    setSelectedBatchId(sub.batchId || "");
    setActive(sub.active === true);
    setPaymentStatus(sub.paymentStatus || "paid");

    if (sub.expiryDate?.toDate) {
      const d = sub.expiryDate.toDate();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setExpiryDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setExpiryDate("");
    }

    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUserId || !selectedBatchId) {
      toast({
        title: "Missing fields",
        description: "Please select user and batch",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const selectedBatch = batches.find((b: any) => b.id === selectedBatchId);
      const selectedUser = users.find((u: any) => u.id === selectedUserId);

      if (!selectedUser) {
        toast({
          title: "User not found",
          description: "Please select a valid user.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      const payload: any = {
        userUid: selectedUser.id || selectedUser.uid || "",
        userPhone: selectedUser.phone || "",
        userEmail: selectedUser.email || "",
        userName: selectedUser.fullName || selectedUser.name || "",

        batchId: selectedBatchId,
        batchName: selectedBatch?.name || selectedBatch?.batchName || "",
        semester: selectedBatch?.semester || "",

        active,
        paymentStatus,
        premiumUnlocked: active && paymentStatus === "paid",
        expiredByAdmin: false,
        updatedAt: Timestamp.now(),
      };

      if (expiryDate) {
        payload.expiryDate = Timestamp.fromDate(new Date(expiryDate));
      } else {
        payload.expiryDate = null;
      }

      if (editing) {
        await updateDoc(doc(db, "subscriptions", editing.id), payload);

        toast({
          title: "Subscription updated",
          description: "Subscription has been updated successfully",
        });
      } else {
        await addDoc(collection(db, "subscriptions"), {
          ...payload,
          purchaseDate: Timestamp.now(),
          createdAt: Timestamp.now(),
        });

        toast({
          title: "Subscription created",
          description: "Batch access has been assigned",
        });
      }

      setOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save subscription",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "subscriptions", id));
      toast({
        title: "Subscription deleted",
      });
      loadData();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="Subscription Management">
      <div className="space-y-5">
        <div className="flex justify-end">
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Give Subscription
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : subscriptions.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No subscriptions yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub: any) => (
              <Card key={sub.id}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <p className="font-semibold">{sub.userEmail}</p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Batch: {sub.batchName || sub.batchId}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Status: {sub.active ? "Active" : "Inactive"} • Payment:{" "}
                      {sub.paymentStatus || "unknown"}
                    </p>

                    {sub.expiryDate?.toDate && (
                      <p className="text-sm text-muted-foreground">
                        Expiry: {sub.expiryDate.toDate().toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openEdit(sub)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove student access for this batch.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive"
                            onClick={() => handleDelete(sub.id)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Subscription" : "Give Subscription"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Student</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u: any) => u.role !== "admin")
                    .map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName || u.name || "Unnamed User"}
                        {u.phone
                          ? ` • ${u.phone}`
                          : u.email
                            ? ` • ${u.email}`
                            : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Batch</Label>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose batch" />
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
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label className="block mb-1">Active Access</Label>
                <p className="text-xs text-muted-foreground">
                  Turn off to instantly block access
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update Subscription" : "Create Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}