import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import Leaderboard from "./pages/Leaderboard";
import Feed from "./pages/Feed";
import { RouteMetadata } from "@/components/RouteMetadata";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Referrals = lazy(() => import("./pages/Referrals"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement").then((module) => ({ default: module.UserManagement })));
const SubmissionModeration = lazy(() => import("@/pages/admin/SubmissionModeration").then((module) => ({ default: module.SubmissionModeration })));
const ChallengeModeration = lazy(() => import("@/pages/admin/ChallengeModeration").then((module) => ({ default: module.ChallengeModeration })));
const Analytics = lazy(() => import("@/pages/admin/Analytics").then((module) => ({ default: module.Analytics })));
const ActivityLogs = lazy(() => import("@/pages/admin/ActivityLogs").then((module) => ({ default: module.ActivityLogs })));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then((module) => ({ default: module.AdminLayout })));
const PaymentAnalytics = lazy(() => import("@/pages/admin/PaymentAnalytics"));
const CreateChallenge = lazy(() => import("@/pages/admin/CreateChallenge").then((module) => ({ default: module.CreateChallenge })));
const RewardsManagement = lazy(() => import("@/pages/admin/RewardsManagement").then((module) => ({ default: module.RewardsManagement })));
const ChallengeAutomation = lazy(() => import("@/pages/admin/ChallengeAutomation").then((module) => ({ default: module.ChallengeAutomation })));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading page">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Inner component that uses push notifications
const AppContent = () => {
  // Initialize push notifications for the authenticated user
  usePushNotifications();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/" element={<PageErrorBoundary pageName="Home"><Index /></PageErrorBoundary>} />
      <Route path="/auth" element={<PageErrorBoundary pageName="Authentication"><Auth /></PageErrorBoundary>} />
      <Route path="/profile" element={<PageErrorBoundary pageName="Profile"><Profile /></PageErrorBoundary>} />
      <Route path="/profile/:userId" element={<PageErrorBoundary pageName="Profile"><Profile /></PageErrorBoundary>} />
      <Route path="/challenge/:id" element={<PageErrorBoundary pageName="Challenge"><ChallengeDetail /></PageErrorBoundary>} />
      <Route path="/leaderboard" element={<PageErrorBoundary pageName="Leaderboard"><Leaderboard /></PageErrorBoundary>} />
      <Route path="/feed" element={<PageErrorBoundary pageName="Feed"><Feed /></PageErrorBoundary>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/wallet" element={<PageErrorBoundary pageName="Wallet"><Wallet /></PageErrorBoundary>} />
        <Route path="/referrals" element={<PageErrorBoundary pageName="Referrals"><Referrals /></PageErrorBoundary>} />
      </Route>
      <Route path="/faq" element={<PageErrorBoundary pageName="FAQ"><FAQ /></PageErrorBoundary>} />
      <Route element={<RoleRoute allowedRoles={["admin", "moderator"]} />}>
        <Route path="/admin" element={<PageErrorBoundary pageName="Admin"><AdminLayout /></PageErrorBoundary>}>
          <Route index element={<AdminDashboard />} />
          <Route path="submissions" element={<SubmissionModeration />} />
          <Route path="challenges" element={<ChallengeModeration />} />
          <Route element={<RoleRoute allowedRoles={["admin"]} />}>
            <Route path="users" element={<UserManagement />} />
            <Route path="create-challenge" element={<CreateChallenge />} />
            <Route path="automation" element={<ChallengeAutomation />} />
            <Route path="rewards" element={<RewardsManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="payments" element={<PaymentAnalytics />} />
            <Route path="logs" element={<ActivityLogs />} />
          </Route>
        </Route>
      </Route>
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <RouteMetadata />
              <AppContent />
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
