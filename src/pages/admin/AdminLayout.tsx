import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  BookMarked,
  FileQuestion,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/batches", label: "Batches", icon: GraduationCap },
  { href: "/admin/subjects", label: "Subjects", icon: BookMarked },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: ShieldCheck },
  { href: "/admin/lectures", label: "Lectures", icon: BookOpen },
  { href: "/admin/notes", label: "Notes", icon: FileText },
  { href: "/admin/pyq", label: "Previous Questions", icon: FileQuestion },
  { href: "/admin/tests", label: "Tests", icon: ClipboardList },
  { href: "/admin/notices", label: "Notices", icon: Bell },
  { href: "/admin/support", label: "Support Tickets", icon: LifeBuoy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location.startsWith(href);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookMarked className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white font-serif">CUPHY</span>
          </Link>
          <Badge className="mt-2 bg-primary/20 text-primary-foreground border-primary/30 text-xs">
            Admin Panel
          </Badge>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href, item.exact) ? "default" : "ghost"}
                className={`w-full justify-start gap-3 text-sm ${
                  isActive(item.href, item.exact)
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-sidebar-foreground/70">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">
              {user?.name || user?.fullName || user?.email || "Admin"}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sm text-sidebar-foreground hover:bg-red-500/20 hover:text-red-400"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
          <div>{title && <h1 className="text-xl font-bold">{title}</h1>}</div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                View Site <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}