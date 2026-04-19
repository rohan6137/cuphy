import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import BrandLogo from "@/components/branding/BrandLogo";
import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  ClipboardList,
  User,
  LogOut,
  Menu,
  ChevronDown,
  Home,
  Settings,
  Bell,
  LifeBuoy,
  Layers,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/batches", label: "Batches", icon: GraduationCap },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
  { href: "/notes", label: "Notes", icon: FileText, auth: true },
  { href: "/tests", label: "Tests", icon: ClipboardList, auth: true },
];

function getCreatedAtValue(createdAt: any) {
  if (!createdAt) return 0;
  if (typeof createdAt?.toMillis === "function") return createdAt.toMillis();
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === "string") {
    const parsed = new Date(createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function getNotificationIcon(contentType?: string) {
  switch (contentType) {
    case "batch":
      return <Layers className="w-4 h-4" />;
    case "lecture":
      return <GraduationCap className="w-4 h-4" />;
    case "note":
    case "pyq":
    case "assignment":
      return <FileText className="w-4 h-4" />;
    case "test":
      return <ClipboardList className="w-4 h-4" />;
    case "support":
      return <LifeBuoy className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { notifications, unreadCount, loading } = useRealtimeNotifications();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleLinks = navLinks.filter((l) => !l.auth || isAuthenticated);
  const displayName = user?.fullName || user?.name || "Student";
  const latestNotifications = notifications.slice(0, 5);

  const markAsRead = async (notificationId: string) => {
    if (!user?.uid || !notificationId) return;

    try {
      await setDoc(
        doc(db, "users", user.uid, "notificationReads", notificationId),
        {
          notificationId,
          readAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-[74px] items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="flex items-center gap-3 shrink-0">
                <BrandLogo tone="light" size="lg" className="shrink-0" />
                <div className="leading-tight min-w-0">
                  <span className="block text-lg md:text-xl font-bold font-serif brand-gradient-text tracking-tight">
                    CUPHY
                  </span>
                  <span className="hidden sm:block text-[11px] md:text-xs text-muted-foreground font-medium whitespace-nowrap">
                    Physics EdTech Platform
                  </span>
                </div>
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-1 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-sm px-2 py-1.5 shadow-sm">
              {visibleLinks.map((link) => {
                const isActive = location === link.href;

                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-2 rounded-xl px-4 transition-all ${
                        isActive
                          ? "shadow-sm bg-primary/10 text-primary"
                          : "text-foreground/80 hover:text-foreground"
                      }`}
                    >
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}

              {isAdmin && (
                <Link href="/admin">
                  <Button
                    variant={location.startsWith("/admin") ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-2 rounded-xl px-4 ${
                      location.startsWith("/admin")
                        ? "shadow-sm bg-primary/10 text-primary"
                        : "text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-2xl border bg-card/75 backdrop-blur-sm hover:bg-muted/60"
                      >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="w-[340px] rounded-2xl p-0 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-transparent">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm">Notifications</p>
                            <p className="text-xs text-muted-foreground">
                              Latest updates from CUPHY
                            </p>
                          </div>
                          {notifications.length > 0 && (
                            <Badge variant="secondary" className="rounded-full">
                              {unreadCount} unread
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto">
                        {loading ? (
                          <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="rounded-2xl border p-3 animate-pulse bg-muted/40"
                              >
                                <div className="h-4 w-2/3 rounded bg-muted mb-2" />
                                <div className="h-3 w-full rounded bg-muted mb-2" />
                                <div className="h-3 w-1/3 rounded bg-muted" />
                              </div>
                            ))}
                          </div>
                        ) : latestNotifications.length === 0 ? (
                          <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                              <Bell className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-medium">No new notifications</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Updates will appear here
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 space-y-2">
                            {latestNotifications.map((n) => {
                              const routePath = n.routePath || "/notifications";

                              return (
                                <Link
                                  key={n.id}
                                  href={routePath}
                                  onClick={() => markAsRead(n.id)}
                                >
                                  <div
                                    className={`rounded-2xl border transition p-3 cursor-pointer hover:bg-muted/30 ${
                                      n.isRead
                                        ? "bg-card"
                                        : "bg-primary/5 border-primary/20"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                          n.isRead
                                            ? "bg-primary/10 text-primary"
                                            : "bg-primary text-primary-foreground"
                                        }`}
                                      >
                                        {getNotificationIcon(n.contentType)}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="text-sm font-semibold leading-snug line-clamp-2">
                                            {n.title || "Notification"}
                                          </p>
                                          {!n.isRead && (
                                            <span className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                                          )}
                                        </div>

                                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                          {n.message || "No details available"}
                                        </p>

                                        {n.createdAt ? (
                                          <p className="text-[11px] text-muted-foreground mt-2">
                                            {new Date(
                                              getCreatedAtValue(n.createdAt)
                                            ).toLocaleDateString("en-IN")}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="border-t p-2">
                        <Link href="/notifications">
                          <Button variant="ghost" className="w-full rounded-xl">
                            View all notifications
                          </Button>
                        </Link>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="gap-2 pr-2 rounded-2xl border bg-card/75 backdrop-blur-sm hover:bg-muted/60"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user?.profilePicture || ""} alt={displayName} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:block text-sm font-medium max-w-24 truncate">
                          {displayName}
                        </span>
                        <ChevronDown className="w-3 h-3 hidden sm:block" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user?.role || "student"}
                        </p>
                      </div>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" /> Profile
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href="/support" className="cursor-pointer">
                          <LifeBuoy className="mr-2 h-4 w-4" /> Help & Support
                        </Link>
                      </DropdownMenuItem>

                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" /> Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={logout}
                        className="text-destructive cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {!isAuthenticated && (
                <Link href="/login">
                  <Button
                    size="sm"
                    className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Sign In
                  </Button>
                </Link>
              )}

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden rounded-2xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent
                  side="left"
                  className="w-72 bg-background text-foreground border-r"
                >
                  <div className="flex items-center gap-3 mb-8 mt-2">
                    <BrandLogo tone="light" size="lg" className="shrink-0" />
                    <div className="leading-tight">
                      <span className="text-xl font-bold font-serif block brand-gradient-text">
                        CUPHY
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Physics EdTech Platform
                      </span>
                    </div>
                  </div>

                  <nav className="flex flex-col gap-2">
                    {visibleLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Button
                          variant={location === link.href ? "secondary" : "ghost"}
                          className={`w-full justify-start gap-3 rounded-2xl h-11 ${
                            location === link.href ? "bg-primary/10 text-primary" : ""
                          }`}
                        >
                          <link.icon className="w-4 h-4" />
                          {link.label}
                        </Button>
                      </Link>
                    ))}

                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 rounded-2xl h-11"
                        >
                          <Settings className="w-4 h-4" />
                          Admin
                        </Button>
                      </Link>
                    )}

                    {isAuthenticated && (
                      <>
                        <Link href="/notifications" onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 rounded-2xl h-11"
                          >
                            <Bell className="w-4 h-4" />
                            Notifications
                            {unreadCount > 0 && (
                              <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            )}
                          </Button>
                        </Link>

                        <Link href="/support" onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 rounded-2xl h-11"
                          >
                            <LifeBuoy className="w-4 h-4" />
                            Help & Support
                          </Button>
                        </Link>
                      </>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-24 border-t border-border bg-gradient-to-r from-card via-card to-muted/30 backdrop-blur-sm">
        <div className="relative w-full px-6 sm:px-8 lg:px-12 py-6">
          <div className="absolute inset-0 pointer-events-none opacity-35">
            <div className="absolute left-0 top-0 h-full w-24 bg-primary/5 blur-2xl" />
            <div className="absolute right-0 top-0 h-full w-24 bg-primary/5 blur-2xl" />
          </div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3 shrink-0">
              <BrandLogo tone="light" size="md" className="shrink-0" />
              <div className="leading-tight">
                <span className="block text-sm font-bold font-serif brand-gradient-text">
                  CUPHY
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Physics EdTech Platform
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed max-w-none">
              Built for Calcutta University Physics Honours students. Physics Made Powerful.
            </p>

            <p className="text-xs text-muted-foreground font-medium whitespace-nowrap shrink-0">
              &copy; {new Date().getFullYear()} CUPHY
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}