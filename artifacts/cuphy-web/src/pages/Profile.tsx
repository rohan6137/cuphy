import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetMe, useUpdateProfile, getGetMeQueryKey, useGetMyTestResults, getGetMyTestResultsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@/lib/custom-fetch";
import { User, Lock, Award, ClipboardList, TrendingUp, Loader2, CheckCircle } from "lucide-react";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const { data: profileData } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: resultsData } = useGetMyTestResults({ query: { queryKey: getGetMyTestResultsQueryKey() } });

  const updateProfile = useUpdateProfile();

  const profile = profileData ?? user;
  const results = resultsData?.results ?? [];

  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
    : 0;

  const [formData, setFormData] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    semester: String(user?.semester ?? ""),
  });

  const [pwData, setPwData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handleProfileSave = () => {
    updateProfile.mutate({
      data: {
        name: formData.name,
        email: formData.email || undefined,
        semester: formData.semester ? parseInt(formData.semester) : undefined,
      }
    }, {
      onSuccess: (res: any) => {
        updateUser(res);
        setEditing(false);
        toast({ title: "Profile updated!" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handlePasswordChange = async () => {
    if (pwData.newPassword !== pwData.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      await customFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pwData.currentPassword, newPassword: pwData.newPassword }),
      });
      setPwData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold font-serif mb-8">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Avatar + Stats */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-bold text-lg">{user?.name}</h2>
                <p className="text-muted-foreground text-sm">{user?.phone}</p>
                {user?.email && <p className="text-muted-foreground text-xs mt-1">{user.email}</p>}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
                  {user?.semester && <Badge variant="outline">Sem {user.semester}</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipboardList className="w-4 h-4" /> Tests Taken
                  </div>
                  <span className="font-bold">{results.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" /> Avg Score
                  </div>
                  <span className="font-bold">{avgScore.toFixed(1)}%</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="w-4 h-4" /> Best Score
                  </div>
                  <span className="font-bold">
                    {results.length > 0 ? `${Math.max(...results.map(r => r.percentage)).toFixed(1)}%` : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Edit Forms */}
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
                      setFormData({ name: user?.name ?? "", email: user?.email ?? "", semester: String(user?.semester ?? "") });
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
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    disabled={!editing}
                    data-testid="input-profile-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input value={user?.phone ?? ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (optional)</Label>
                  <Input
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    disabled={!editing}
                    placeholder="your@email.com"
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Semester</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={val => setFormData(p => ({ ...p, semester: val }))}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(s => (
                        <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editing && (
                  <Button
                    onClick={handleProfileSave}
                    disabled={updateProfile.isPending}
                    className="w-full gap-2"
                    data-testid="button-save-profile"
                  >
                    {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={pwData.currentPassword}
                    onChange={e => setPwData(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    data-testid="input-current-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={pwData.newPassword}
                    onChange={e => setPwData(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={pwData.confirmPassword}
                    onChange={e => setPwData(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={pwLoading || !pwData.currentPassword || !pwData.newPassword}
                  className="w-full gap-2"
                  data-testid="button-change-password"
                >
                  {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {results.length > 0 && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" /> Test History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">Test #{r.testId}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{r.score}/{r.totalMarks}</p>
                          <Badge variant="outline" className={`text-xs ${r.percentage >= 60 ? 'text-green-600' : 'text-orange-600'}`}>
                            {r.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
