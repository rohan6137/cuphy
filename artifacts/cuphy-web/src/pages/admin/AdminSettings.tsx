import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { useGetAppSettings, useUpdateAppSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, Palette, Type, Save, CheckCircle } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading, refetch } = useGetAppSettings();
  const updateSettings = useUpdateAppSettings();

  const [form, setForm] = useState({
    appName: "CUPHY",
    tagline: "Physics Made Powerful",
    primaryColor: "#7C3AED",
    secondaryColor: "#1E1B4B",
    darkMode: false,
    maintenanceMode: false,
    contactEmail: "",
    contactPhone: "",
    razorpayKeyId: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        appName: settings.appName ?? "CUPHY",
        tagline: settings.tagline ?? "Physics Made Powerful",
        primaryColor: settings.primaryColor ?? "#7C3AED",
        secondaryColor: settings.secondaryColor ?? "#1E1B4B",
        darkMode: settings.darkMode ?? false,
        maintenanceMode: settings.maintenanceMode ?? false,
        contactEmail: (settings as any).contactEmail ?? "",
        contactPhone: (settings as any).contactPhone ?? "",
        razorpayKeyId: (settings as any).razorpayKeyId ?? "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({ data: form }, {
      onSuccess: () => { toast({ title: "Settings saved!" }); refetch(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <AdminLayout title="App Settings">
      <div className="max-w-2xl space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Branding */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" /> App Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>App Name</Label>
                  <Input value={form.appName} onChange={e => setForm(p => ({ ...p, appName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tagline</Label>
                  <Input value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))} placeholder="Physics Made Powerful" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="contact@cuphy.in" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="9800000000" />
                </div>
              </CardContent>
            </Card>

            {/* Theme */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> Theme Colors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.secondaryColor}
                        onChange={e => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input value={form.secondaryColor} onChange={e => setForm(p => ({ ...p, secondaryColor: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border" style={{ background: `linear-gradient(to right, ${form.primaryColor}, ${form.secondaryColor})` }}>
                  <p className="text-white text-sm font-bold text-center">Color Preview</p>
                </div>
              </CardContent>
            </Card>

            {/* System */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" /> System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Maintenance Mode</p>
                    <p className="text-xs text-muted-foreground">Temporarily disable the site for maintenance</p>
                  </div>
                  <Switch checked={form.maintenanceMode} onCheckedChange={v => setForm(p => ({ ...p, maintenanceMode: v }))} />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Payment Gateway Key ID (Razorpay)</Label>
                  <Input value={form.razorpayKeyId} onChange={e => setForm(p => ({ ...p, razorpayKeyId: e.target.value }))} placeholder="rzp_live_..." />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full gap-2" size="lg" data-testid="button-save-settings">
              {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </Button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
