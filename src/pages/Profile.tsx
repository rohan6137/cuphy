import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { User, Lock, Loader2, CheckCircle, Sparkles } from "lucide-react";

const avatarOptions = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics1",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics2",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics3",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics4",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics5",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics6",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics7",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Physics8",
];

const MUST_SET_PASSWORD_KEY = "cuphy_must_set_password";

function getMustSetPasswordFlag() {
  return sessionStorage.getItem(MUST_SET_PASSWORD_KEY) === "1";
}

function clearMustSetPasswordFlag() {
  sessionStorage.removeItem(MUST_SET_PASSWORD_KEY);
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("91") && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (raw.trim().startsWith("+")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export default function Profile() {
  const { user, updateUser, firebaseUser } = useAuth();
  const { toast } = useToast();
  const mustSetPassword = getMustSetPasswordFlag();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    semester: String(user?.semester ?? ""),
    profilePicture: user?.profilePicture ?? "",
  });

  const [pwData, setPwData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const displayName = useMemo(() => {
    return formData.fullName || user?.fullName || "Student";
  }, [formData.fullName, user?.fullName]);

  const handleProfileSave = async () => {
    if (!user?.uid) return;

    const normalizedPhone = normalizePhone(formData.phone);
    const normalizedEmail = normalizeEmail(formData.email);

    if (!formData.fullName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    if (!normalizedPhone) {
      toast({
        title: "Mobile number required",
        description: "Please enter a valid mobile number.",
        variant: "destructive",
      });
      return;
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const phoneQuery = query(
        collection(db, "users"),
        where("phone", "==", normalizedPhone),
        limit(1)
      );

      const phoneSnap = await getDocs(phoneQuery);

      const phoneUsedByAnotherUser =
        !phoneSnap.empty && phoneSnap.docs[0].id !== user.uid;

      if (phoneUsedByAnotherUser) {
        toast({
          title: "Mobile already in use",
          description: "This mobile number is already linked to another account.",
          variant: "destructive",
        });
        return;
      }

      if (normalizedEmail) {
        const emailQuery = query(
          collection(db, "users"),
          where("email", "==", normalizedEmail),
          limit(1)
        );

        const emailSnap = await getDocs(emailQuery);

        const emailUsedByAnotherUser =
          !emailSnap.empty && emailSnap.docs[0].id !== user.uid;

        if (emailUsedByAnotherUser) {
          toast({
            title: "Email already in use",
            description: "This email is already linked to another account.",
            variant: "destructive",
          });
          return;
        }
      }

      const payload = {
        fullName: formData.fullName.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        semester: formData.semester ? parseInt(formData.semester) : null,
        profilePicture: formData.profilePicture || "",
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", user.uid), payload);

      updateUser({
        ...user,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        semester: payload.semester ?? undefined,
        profilePicture: payload.profilePicture,
      });

      setFormData((prev) => ({
        ...prev,
        phone: normalizedPhone,
        email: normalizedEmail,
      }));

      setEditing(false);

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Unable to save profile changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user?.uid) {
      toast({
        title: "Password change unavailable",
        description: "This account cannot change password right now.",
        variant: "destructive",
      });
      return;
    }

    if (
      (!mustSetPassword && !pwData.currentPassword) ||
      !pwData.newPassword ||
      !pwData.confirmPassword
    ) {
      toast({
        title: "Fill all password fields",
        variant: "destructive",
      });
      return;
    }

    if (pwData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (pwData.newPassword !== pwData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    try {
      setPwLoading(true);

      if (mustSetPassword) {
        const response = await fetch(
          "https://asia-south1-cuphy-d68ca.cloudfunctions.net/resetUserPassword",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uid: user.uid,
              newPassword: pwData.newPassword,
            }),
          }
        );

        let result: any = null;
        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Unable to change password.");
        }

        clearMustSetPasswordFlag();

        setPwData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        toast({
          title: "Password set successfully",
          description:
            "Your new password is ready. Please use it next time you sign in.",
        });
        return;
      }

      if (!firebaseUser?.email) {
        toast({
          title: "Password change unavailable",
          description: "This account cannot change password right now.",
          variant: "destructive",
        });
        return;
      }

      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        pwData.currentPassword
      );

      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, pwData.newPassword);

      setPwData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    } catch (err: any) {
      console.error("Password change error:", err);

      let message = err?.message || "Unable to change password.";

      if (err?.code === "auth/invalid-credential") {
        message = "Current password is incorrect.";
      } else if (err?.code === "auth/wrong-password") {
        message = "Current password is incorrect.";
      } else if (err?.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      } else if (err?.code === "auth/requires-recent-login") {
        message = "Please log in again, then try changing password.";
      } else if (err?.code === "auth/email-already-in-use") {
        message =
          "A password login is already linked for this account. Try signing in with your latest password, or contact admin if needed.";
      } else if (err?.code === "auth/provider-already-linked") {
        message = "Password login is already linked for this account.";
      } else if (err?.code === "auth/credential-already-in-use") {
        message =
          "This password credential is already in use for another account.";
      } else if (err?.code === "auth/operation-not-allowed") {
        message =
          "Email/password sign-in is not enabled in Firebase Authentication.";
      }

      toast({
        title: "Password change failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold font-serif mb-8">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border shadow">
                  <AvatarImage src={formData.profilePicture || ""} alt={displayName} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <h2 className="font-bold text-lg">{displayName}</h2>
                <p className="text-muted-foreground text-sm">
                  {formData.phone || user?.phone}
                </p>
                {formData.email && (
                  <p className="text-muted-foreground text-xs mt-1">{formData.email}</p>
                )}

                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge variant="secondary" className="capitalize">
                    {user?.role}
                  </Badge>
                  {user?.semester && <Badge variant="outline">Sem {user.semester}</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Type</span>
                  <span className="font-bold capitalize">{user?.role}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-green-600 border-green-500/30">
                    Active
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Premium Identity</span>
                  <span className="font-bold">CUPHY Student</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Personal Information
                </CardTitle>
                <Button
                  size="sm"
                  variant={editing ? "outline" : "default"}
                  onClick={() => {
                    if (editing) {
                      setFormData({
                        fullName: user?.fullName ?? "",
                        phone: user?.phone ?? "",
                        email: user?.email ?? "",
                        semester: String(user?.semester ?? ""),
                        profilePicture: user?.profilePicture ?? "",
                      });
                    }
                    setEditing(!editing);
                  }}
                >
                  {editing ? "Cancel" : "Edit"}
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, fullName: e.target.value }))
                    }
                    disabled={!editing}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Mobile Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, phone: e.target.value }))
                    }
                    disabled={!editing}
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                    disabled={!editing}
                    placeholder="Enter your linked email"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can update your linked email here and use it for student login.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Semester</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(val) =>
                      setFormData((p) => ({ ...p, semester: val }))
                    }
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <Label>Select Avatar</Label>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
                    {avatarOptions.map((avatar) => {
                      const selected = formData.profilePicture === avatar;

                      return (
                        <button
                          key={avatar}
                          type="button"
                          disabled={!editing}
                          onClick={() =>
                            setFormData((p) => ({ ...p, profilePicture: avatar }))
                          }
                          className={`rounded-full p-1 border-2 transition ${
                            selected
                              ? "border-primary scale-105"
                              : "border-transparent hover:border-primary/40"
                          } ${!editing ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={avatar} alt="avatar" />
                            <AvatarFallback>A</AvatarFallback>
                          </Avatar>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editing && (
                  <Button
                    onClick={handleProfileSave}
                    disabled={saving}
                    className="w-full gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>

            {mustSetPassword && (
              <Card className="border-red-500/40 bg-red-50 dark:bg-red-950/40">
                <CardContent className="p-4 text-center">
                  <h2 className="font-bold text-red-600 dark:text-red-400">
                    Set a new password for security reasons
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    You logged in using OTP. Please set a new password to continue using your
                    account safely.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  {mustSetPassword ? "Set New Password" : "Change Password"}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {!mustSetPassword && (
                  <div className="space-y-1.5">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={pwData.currentPassword}
                      onChange={(e) =>
                        setPwData((p) => ({ ...p, currentPassword: e.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>{mustSetPassword ? "Set New Password" : "New Password"}</Label>
                  <Input
                    type="password"
                    value={pwData.newPassword}
                    onChange={(e) =>
                      setPwData((p) => ({ ...p, newPassword: e.target.value }))
                    }
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={pwData.confirmPassword}
                    onChange={(e) =>
                      setPwData((p) => ({ ...p, confirmPassword: e.target.value }))
                    }
                    placeholder="••••••••"
                  />
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={
                    pwLoading ||
                    (!mustSetPassword && !pwData.currentPassword) ||
                    !pwData.newPassword ||
                    !pwData.confirmPassword
                  }
                  className="w-full gap-2"
                >
                  {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {mustSetPassword ? "Set New Password" : "Change Password"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}