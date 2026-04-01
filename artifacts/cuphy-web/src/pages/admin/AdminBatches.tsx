import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useListBatches, useCreateBatch, useUpdateBatch, useDeleteBatch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Loader2, Users, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const emptyForm = {
  name: "", description: "", semester: "1", price: "", originalPrice: "", paymentLink: "", isActive: true, expiresAt: ""
};

export default function AdminBatches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useListBatches({});
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const batches = data?.batches ?? [];

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      name: b.name, description: b.description ?? "", semester: String(b.semester),
      price: String(b.price), originalPrice: b.originalPrice ? String(b.originalPrice) : "",
      paymentLink: b.paymentLink ?? "", isActive: b.isActive,
      expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString().split("T")[0] : ""
    });
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      description: form.description,
      semester: parseInt(form.semester),
      price: parseInt(form.price),
      originalPrice: form.originalPrice ? parseInt(form.originalPrice) : undefined,
      paymentLink: form.paymentLink || undefined,
      isActive: form.isActive,
      expiresAt: form.expiresAt || undefined,
    };

    if (editing) {
      updateBatch.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast({ title: "Batch updated!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    } else {
      createBatch.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Batch created!" }); setOpen(false); refetch(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteBatch.mutate({ id }, {
      onSuccess: () => { toast({ title: "Batch deleted" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const isPending = createBatch.isPending || updateBatch.isPending;

  return (
    <AdminLayout title="Batch Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{batches.length} batches total</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2" data-testid="button-add-batch">
                <Plus className="w-4 h-4" /> Add Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Batch" : "Create New Batch"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Batch Name *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Physics Semester 1 2025" data-testid="input-batch-name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Batch description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Semester *</Label>
                    <Select value={form.semester} onValueChange={v => setForm(p => ({ ...p, semester: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price (₹) *</Label>
                    <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="999" data-testid="input-batch-price" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Original Price (₹)</Label>
                    <Input type="number" value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))} placeholder="1999" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expires At</Label>
                    <Input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Link</Label>
                  <Input value={form.paymentLink} onChange={e => setForm(p => ({ ...p, paymentLink: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isPending || !form.name || !form.price} data-testid="button-save-batch">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3" />
            <p>No batches yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map(batch => (
              <Card key={batch.id} className="border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{batch.name}</p>
                      <Badge variant="secondary" className="text-xs">Sem {batch.semester}</Badge>
                      <Badge variant={batch.isActive ? "default" : "outline"} className="text-xs">
                        {batch.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span>₹{batch.price}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{batch.studentsCount} students</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(batch)} data-testid={`button-edit-batch-${batch.id}`}>
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
                          <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{batch.name}" and all its content. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(batch.id)} className="bg-destructive">Delete</AlertDialogAction>
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
