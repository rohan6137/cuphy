import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  ClipboardList,
  Bell,
  ChevronRight,
  Activity,
  LifeBuoy,
} from "lucide-react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [batches, setBatches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [batchSnap, userSnap, testSnap, noticeSnap, ticketSnap] =
          await Promise.all([
            getDocs(collection(db, "batches")),
            getDocs(collection(db, "users")),
            getDocs(collection(db, "tests")),
            getDocs(collection(db, "notices")),
            getDocs(collection(db, "supportTickets")),
          ]);

        const batchList = batchSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const userList = userSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const testList = testSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const noticeList = noticeSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const ticketList = ticketSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setBatches(batchList);
        setUsers(userList);
        setTests(testList);
        setNotices(noticeList);
        setTickets(ticketList);
      } catch (error) {
        console.error("Error loading admin dashboard:", error);
        setBatches([]);
        setUsers([]);
        setTests([]);
        setNotices([]);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const totalBatches = batches.length;
  const totalUsers = users.length;
  const totalStudents = users.filter((u) => u.role === "student").length;
  const activeTests = tests.filter((t) => t.isVisible !== false).length;
  const activeNotices = notices.filter((n) => n.isVisible !== false).length;
  const openTickets = tickets.filter(
    (t) => (t.status || "open").toLowerCase() !== "resolved"
  ).length;

  const stats = [
    {
      label: "Total Batches",
      value: totalBatches,
      icon: GraduationCap,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
      href: "/admin/batches",
    },
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
      href: "/admin/users",
    },
    {
      label: "Active Tests",
      value: activeTests,
      icon: ClipboardList,
      color: "text-green-500 bg-green-50 dark:bg-green-900/20",
      href: "/admin/tests",
    },
    {
      label: "Active Notices",
      value: activeNotices,
      icon: Bell,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
      href: "/admin/notices",
    },
    {
      label: "Open Tickets",
      value: openTickets,
      icon: LifeBuoy,
      color: "text-red-500 bg-red-50 dark:bg-red-900/20",
      href: "/admin/support",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <Link key={s.label} href={s.href}>
              <Card className="border-border hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div
                    className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}
                  >
                    <s.icon className={`w-5 h-5 ${s.color.split(" ")[0]}`} />
                  </div>

                  {loading ? (
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
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : batches.length > 0 ? (
                [...batches]
                  .sort((a, b) => {
                    const aTime = a.createdAt?.seconds || 0;
                    const bTime = b.createdAt?.seconds || 0;
                    return bTime - aTime;
                  })
                  .slice(0, 5)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {b.batchName || b.name || "Unnamed Batch"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sem {b.semester || "-"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">₹{b.price || 0}</span>
                        <Badge
                          variant={
                            b.isActive === false || b.isVisible === false
                              ? "secondary"
                              : "default"
                          }
                          className="text-xs"
                        >
                          {b.isActive === false || b.isVisible === false
                            ? "Inactive"
                            : "Active"}
                        </Badge>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">No batches</p>
              )}
            </CardContent>
          </Card>

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
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : users.length > 0 ? (
                [...users]
                  .sort((a, b) => {
                    const aTime = a.createdAt?.seconds || 0;
                    const bTime = b.createdAt?.seconds || 0;
                    return bTime - aTime;
                  })
                  .slice(0, 5)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                        {(u.name || "U").charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {u.name || "Unnamed User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {u.phone || u.email || "No contact info"}
                        </p>
                      </div>

                      <Badge
                        variant={u.role === "admin" ? "default" : "secondary"}
                        className="text-xs capitalize shrink-0"
                      >
                        {u.role || "student"}
                      </Badge>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">No users</p>
              )}
            </CardContent>
          </Card>
        </div>

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
                { href: "/admin/notifications", label: "🔔 Send Notification" },
                { href: "/admin/support", label: "🎫 Support Tickets" },
              ].map((a) => (
                <Link key={a.href} href={a.href}>
                  <Button variant="outline" size="sm">
                    {a.label}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Student Accounts</p>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}