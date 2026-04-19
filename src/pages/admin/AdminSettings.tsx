import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Loader2,
  Palette,
  Type,
  Save,
  LifeBuoy,
  MessageCircle,
  Mail,
} from "lucide-react";

const SETTINGS_DOC_ID = "main";

export default function AdminSettings() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    supportEnabled: true,
    supportTicketEnabled: true,
    supportWhatsappNumber: "",
    supportWhatsappLabel: "Chat on WhatsApp",
    supportEmail: "",
    supportEmailLabel: "Email Support",
    supportNote:
      "For urgent issues, use WhatsApp. For detailed issues, use email or submit a support ticket.",
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);

      try {
        const snap = await getDoc(doc(db, "appSettings", SETTINGS_DOC_ID));

        if (snap.exists()) {
          const settings = snap.data() as any;

          setForm({
            appName: settings.appName ?? "CUPHY",
            tagline: settings.tagline ?? "Physics Made Powerful",
            primaryColor: settings.primaryColor ?? "#7C3AED",
            secondaryColor: settings.secondaryColor ?? "#1E1B4B",
            darkMode: settings.darkMode ?? false,
            maintenanceMode: settings.maintenanceMode ?? false,
            contactEmail: settings.contactEmail ?? "",
            contactPhone: settings.contactPhone ?? "",
            razorpayKeyId: settings.razorpayKeyId ?? "",

            supportEnabled: settings.supportEnabled ?? true,
            supportTicketEnabled: settings.supportTicketEnabled ?? true,
            supportWhatsappNumber: settings.supportWhatsappNumber ?? "",
            supportWhatsappLabel: settings.supportWhatsappLabel ?? "Chat on WhatsApp",
            supportEmail: settings.supportEmail ?? "",
            supportEmailLabel: settings.supportEmailLabel ?? "Email Support",
            supportNote:
              settings.supportNote ??
              "For urgent issues, use WhatsApp. For detailed issues, use email or submit a support ticket.",
          });
        }
      } catch (error) {
        console.error("Error loading app settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);

    try {
      await setDoc(
        doc(db, "appSettings", SETTINGS_DOC_ID),
        {
          ...form,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      document.documentElement.classList.toggle("dark", form.darkMode);

      toast({
        title: "Settings saved",
        description: "App settings updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="App Settings">
      <div className="max-w-3xl space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" /> App Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>App Name</Label>
                  <Input
                    value={form.appName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, appName: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tagline</Label>
                  <Input
                    value={form.tagline}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tagline: e.target.value }))
                    }
                    placeholder="Physics Made Powerful"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input
                    value={form.contactEmail}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contactEmail: e.target.value }))
                    }
                    placeholder="contact@cuphy.in"
                    type="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input
                    value={form.contactPhone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contactPhone: e.target.value }))
                    }
                    placeholder="9800000000"
                  />
                </div>
              </CardContent>
            </Card>

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
                        onChange={(e) =>
                          setForm((p) => ({ ...p, primaryColor: e.target.value }))
                        }
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={form.primaryColor}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, primaryColor: e.target.value }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.secondaryColor}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, secondaryColor: e.target.value }))
                        }
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={form.secondaryColor}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, secondaryColor: e.target.value }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: `linear-gradient(to right, ${form.primaryColor}, ${form.secondaryColor})`,
                  }}
                >
                  <p className="text-white text-sm font-bold text-center">
                    Color Preview
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Colors are saved for future theme support. Global color override is currently disabled to preserve the existing UI theme.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-primary" /> Help & Support Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable Support Page</p>
                    <p className="text-xs text-muted-foreground">
                      Show Help & Support options to students
                    </p>
                  </div>
                  <Switch
                    checked={form.supportEnabled}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, supportEnabled: v }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable Ticket System</p>
                    <p className="text-xs text-muted-foreground">
                      Let students submit support tickets inside the app
                    </p>
                  </div>
                  <Switch
                    checked={form.supportTicketEnabled}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, supportTicketEnabled: v }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Number
                  </Label>
                  <Input
                    value={form.supportWhatsappNumber}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, supportWhatsappNumber: e.target.value }))
                    }
                    placeholder="919800000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter with country code, no plus sign. Example: 919800000000
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>WhatsApp Button Label</Label>
                  <Input
                    value={form.supportWhatsappLabel}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, supportWhatsappLabel: e.target.value }))
                    }
                    placeholder="Chat on WhatsApp"
                  />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Support Email
                  </Label>
                  <Input
                    value={form.supportEmail}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, supportEmail: e.target.value }))
                    }
                    placeholder="support@cuphy.in"
                    type="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email Button Label</Label>
                  <Input
                    value={form.supportEmailLabel}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, supportEmailLabel: e.target.value }))
                    }
                    placeholder="Email Support"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Support Note</Label>
                  <Textarea
                    value={form.supportNote}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, supportNote: e.target.value }))
                    }
                    placeholder="Help text shown on support page"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

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
                    <p className="text-xs text-muted-foreground">
                      Temporarily disable the site for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={form.maintenanceMode}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, maintenanceMode: v }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Apply dark mode across the app
                    </p>
                  </div>
                  <Switch
                    checked={form.darkMode}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, darkMode: v }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label>Payment Gateway Key ID (Razorpay)</Label>
                  <Input
                    value={form.razorpayKeyId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, razorpayKeyId: e.target.value }))
                    }
                    placeholder="rzp_live_..."
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2"
              size="lg"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Settings
            </Button>
          </>
        )}
      </div>
    </AdminLayout>
  );
}