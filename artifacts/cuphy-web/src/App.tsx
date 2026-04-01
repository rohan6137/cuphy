import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Batches from "@/pages/Batches";
import BatchDetail from "@/pages/BatchDetail";
import Dashboard from "@/pages/Dashboard";
import LectureDetail from "@/pages/LectureDetail";
import Notes from "@/pages/Notes";
import Tests from "@/pages/Tests";
import TestTaker from "@/pages/TestTaker";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminBatches from "@/pages/admin/AdminBatches";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminLectures from "@/pages/admin/AdminLectures";
import AdminNotes from "@/pages/admin/AdminNotes";
import AdminTests from "@/pages/admin/AdminTests";
import AdminNotices from "@/pages/admin/AdminNotices";
import AdminSettings from "@/pages/admin/AdminSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/batches" component={Batches} />
      <Route path="/batches/:id" component={BatchDetail} />
      <Route path="/lectures/:id" component={LectureDetail} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/notes">
        {() => <ProtectedRoute component={Notes} />}
      </Route>
      <Route path="/tests">
        {() => <ProtectedRoute component={Tests} />}
      </Route>
      <Route path="/tests/:id">
        {() => <ProtectedRoute component={TestTaker} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} adminOnly />}
      </Route>
      <Route path="/admin/batches">
        {() => <ProtectedRoute component={AdminBatches} adminOnly />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} adminOnly />}
      </Route>
      <Route path="/admin/lectures">
        {() => <ProtectedRoute component={AdminLectures} adminOnly />}
      </Route>
      <Route path="/admin/notes">
        {() => <ProtectedRoute component={AdminNotes} adminOnly />}
      </Route>
      <Route path="/admin/tests">
        {() => <ProtectedRoute component={AdminTests} adminOnly />}
      </Route>
      <Route path="/admin/notices">
        {() => <ProtectedRoute component={AdminNotices} adminOnly />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute component={AdminSettings} adminOnly />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
