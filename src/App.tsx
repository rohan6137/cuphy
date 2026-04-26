import PremiumCheckout from "@/pages/PremiumCheckout";
import HelpSupport from "@/pages/HelpSupport";
import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2, Settings } from "lucide-react";
import { useAppSettings } from "./hooks/useAppSettings";

import SubjectDetail from "@/pages/SubjectDetail";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Batches from "@/pages/Batches";
import MyBatches from "@/pages/MyBatches";
import BatchDetail from "@/pages/BatchDetail";
import BatchSubjectsPage from "@/pages/BatchSubjectsPage";
import Dashboard from "@/pages/Dashboard";
import LectureDetail from "@/pages/LectureDetail";
import Notes from "@/pages/Notes";

const Tests = lazy(() => import("@/pages/Tests"));
const TestResultDetail = lazy(() => import("@/pages/TestResultDetail"));
const TestTaker = lazy(() => import("@/pages/TestTaker"));
const Profile = lazy(() => import("@/pages/Profile"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Performance = lazy(() => import("@/pages/Performance"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminBatches = lazy(() => import("@/pages/admin/AdminBatches"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminSubscriptions = lazy(() => import("@/pages/admin/AdminSubscriptions"));
const AdminLectures = lazy(() => import("@/pages/admin/AdminLectures"));
const AdminNotes = lazy(() => import("@/pages/admin/AdminNotes"));
const AdminPyq = lazy(() => import("@/pages/admin/AdminPyq"));
const AdminTests = lazy(() => import("@/pages/admin/AdminTests"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminNotices = lazy(() => import("@/pages/admin/AdminNotices"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminSubjects = lazy(() => import("@/pages/admin/AdminSubjects"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function AppSettingsLoader({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useAppSettings();
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  if (loading) {
    return <FullPageLoader />;
  }

  const isAdminRoute = location.startsWith("/admin");
  const isLoginRoute = location === "/login";

  if (settings.maintenanceMode && !isAdminRoute && !isLoginRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-xl w-full text-center rounded-3xl border bg-card p-10 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Settings className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-3xl font-bold mb-3">{settings.appName}</h1>
          <p className="text-muted-foreground mb-2">{settings.tagline}</p>
          <p className="text-sm text-muted-foreground mb-6">
            The platform is temporarily under maintenance. Please check back soon.
          </p>

          {(settings.contactEmail || settings.contactPhone) && (
            <div className="text-sm text-muted-foreground space-y-1 mb-6">
              {settings.contactEmail && <p>Email: {settings.contactEmail}</p>}
              {settings.contactPhone && <p>Phone: {settings.contactPhone}</p>}
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <a href="/login">Login</a>
            </Button>
            <Button asChild>
              <a href="/admin/settings">Admin Settings</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Component />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/batches" component={Batches} />
      <Route path="/batches/:id" component={BatchDetail} />
      <Route path="/batches/:id/subjects" component={BatchSubjectsPage} />
      <Route path="/premium-checkout" component={PremiumCheckout} />
      <Route path="/batches/:batchId/subjects/:subjectId" component={SubjectDetail} />
      <Route path="/lectures/:id" component={LectureDetail} />
      <Route path="/notes" component={Notes} />

      <Route path="/tests">
        {() => (
          <Suspense fallback={<FullPageLoader />}>
            <Tests />
          </Suspense>
        )}
      </Route>

      <Route path="/tests/:id">
        {() => (
          <Suspense fallback={<FullPageLoader />}>
            <TestTaker />
          </Suspense>
        )}
      </Route>

      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/support">
        {() => <ProtectedRoute component={HelpSupport} />}
      </Route>

      <Route path="/tests/result/:id">
        {() => <ProtectedRoute component={TestResultDetail} />}
      </Route>

      <Route path="/performance">
        {() => <ProtectedRoute component={Performance} />}
      </Route>

      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>

      <Route path="/my-batches">
        {() => <ProtectedRoute component={MyBatches} />}
      </Route>

      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>

      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} adminOnly />}
      </Route>

      <Route path="/admin/batches">
        {() => <ProtectedRoute component={AdminBatches} adminOnly />}
      </Route>

      <Route path="/admin/subjects">
        {() => <ProtectedRoute component={AdminSubjects} adminOnly />}
      </Route>

      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} adminOnly />}
      </Route>

      <Route path="/admin/subscriptions">
        {() => <ProtectedRoute component={AdminSubscriptions} adminOnly />}
      </Route>

      <Route path="/admin/lectures">
        {() => <ProtectedRoute component={AdminLectures} adminOnly />}
      </Route>

      <Route path="/admin/notes">
        {() => <ProtectedRoute component={AdminNotes} adminOnly />}
      </Route>

      <Route path="/admin/pyq">
        {() => <ProtectedRoute component={AdminPyq} adminOnly />}
      </Route>

      <Route path="/admin/tests">
        {() => <ProtectedRoute component={AdminTests} adminOnly />}
      </Route>

      <Route path="/admin/support">
        {() => <ProtectedRoute component={AdminSupport} adminOnly />}
      </Route>

      <Route path="/admin/notices">
        {() => <ProtectedRoute component={AdminNotices} adminOnly />}
      </Route>

      <Route path="/admin/notifications">
        {() => <ProtectedRoute component={AdminNotifications} adminOnly />}
      </Route>

      <Route path="/admin/settings">
        {() => <ProtectedRoute component={AdminSettings} adminOnly />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const routerBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={routerBase}>
            <AppSettingsLoader>
              <Router />
            </AppSettingsLoader>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;