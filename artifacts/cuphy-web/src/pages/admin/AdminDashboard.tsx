import AdminLayout from "./AdminLayout";
import { useListBatches, useListUsers, useListTests, useListNotices } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Users, GraduationCap, ClipboardList, Bell, TrendingUp,
  ChevronRight, Activity
} from "lucide-react";

export default function AdminDashboard() {
  const { data: batches, isLoading: bLoading } = useListBatches({});
  const { data: usersData, isLoading: uLoading } = useListUsers({});
  const { data: tests } = useListTests({});
  const { data: notices } = useListNotices({});

  const totalBatches = batches?.batches?.length ?? 0;
  const totalUsers = usersData?.total ?? 0;
  const totalStudents = usersData?.users?.filter(u => u.role === "student").length ?? 0;
  const activeTests = tests?.tests?.filter(t => t.isActive).length ?? 0;
  const activeNotices = notices?.notices?.filter(n => n.isActive).length ?? 0;

  const stats = [
    { label: "Total Batches", value: totalBatches, icon: GraduationCap, color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20", href: "/admin/batches" },
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", href: "/admin/users" },
    { label: "Active Tests", value: activeTests, icon: ClipboardList, color: "text-green-500 bg-green-50 dark:bg-green-900/20", href: "/admin/tests" },
    { label: "Active Notices", value: activeNotices, icon: Bell, color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20", href: "/admin/notices" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Link key={s.label} href={s.href}>
              <Card className="border-border hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                    <s.icon className={`w-5 h-5 ${s.color.split(' ')[0]}`} />
                  </div>
                  {bLoading || uLoading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-3xl font-bold">{s.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Batches */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Batches</CardTitle>
              <Link href="/admin/batches">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {batches?.batches?.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">Sem {b.semester} • {b.studentsCount} students</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">₹{b.price}</span>
                    <Badge variant={b.isActive ? "default" : "secondary"} className="text-xs">
                      {b.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              )) ?? <p className="text-sm text-muted-foreground">No batches</p>}
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Users</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {usersData?.users?.slice(0, 5).map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                  </div>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs capitalize shrink-0">
                    {u.role}
                  </Badge>
                </div>
              )) ?? <p className="text-sm text-muted-foreground">No users</p>}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { href: "/admin/batches", label: "+ New Batch" },
                { href: "/admin/lectures", label: "+ New Lecture" },
                { href: "/admin/notes", label: "+ New Note" },
                { href: "/admin/tests", label: "+ New Test" },
                { href: "/admin/notices", label: "+ New Notice" },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <Button variant="outline" size="sm">{a.label}</Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
