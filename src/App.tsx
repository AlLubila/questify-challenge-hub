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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ChallengeDetail from "./pages/ChallengeDetail";
import Leaderboard from "./pages/Leaderboard";
import Feed from "./pages/Feed";
import Wallet from "./pages/Wallet";
import Referrals from "./pages/Referrals";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { UserManagement } from "@/pages/admin/UserManagement";
import { SubmissionModeration } from "@/pages/admin/SubmissionModeration";
import { ChallengeModeration } from "@/pages/admin/ChallengeModeration";
import { Analytics } from "@/pages/admin/Analytics";
import { ActivityLogs } from "@/pages/admin/ActivityLogs";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import PaymentAnalytics from "@/pages/admin/PaymentAnalytics";
import { CreateChallenge } from "@/pages/admin/CreateChallenge";
import { RewardsManagement } from "@/pages/admin/RewardsManagement";

const queryClient = new QueryClient();

// Inner component that uses push notifications
const AppContent = () => {
  // Initialize push notifications for the authenticated user
  usePushNotifications();

  return (
    <Routes>
      <Route path="/" element={<PageErrorBoundary pageName="Home"><Index /></PageErrorBoundary>} />
      <Route path="/auth" element={<PageErrorBoundary pageName="Authentication"><Auth /></PageErrorBoundary>} />
      <Route path="/profile" element={<PageErrorBoundary pageName="Profile"><Profile /></PageErrorBoundary>} />
      <Route path="/profile/:userId" element={<PageErrorBoundary pageName="Profile"><Profile /></PageErrorBoundary>} />
      <Route path="/challenge/:id" element={<PageErrorBoundary pageName="Challenge"><ChallengeDetail /></PageErrorBoundary>} />
      <Route path="/leaderboard" element={<PageErrorBoundary pageName="Leaderboard"><Leaderboard /></PageErrorBoundary>} />
      <Route path="/feed" element={<PageErrorBoundary pageName="Feed"><Feed /></PageErrorBoundary>} />
      <Route path="/wallet" element={<PageErrorBoundary pageName="Wallet"><Wallet /></PageErrorBoundary>} />
      <Route path="/referrals" element={<PageErrorBoundary pageName="Referrals"><Referrals /></PageErrorBoundary>} />
      <Route path="/faq" element={<PageErrorBoundary pageName="FAQ"><FAQ /></PageErrorBoundary>} />
      <Route path="/admin" element={<PageErrorBoundary pageName="Admin"><AdminLayout /></PageErrorBoundary>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="submissions" element={<SubmissionModeration />} />
        <Route path="challenges" element={<ChallengeModeration />} />
        <Route path="create-challenge" element={<CreateChallenge />} />
        <Route path="rewards" element={<RewardsManagement />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="payments" element={<PaymentAnalytics />} />
        <Route path="logs" element={<ActivityLogs />} />
      </Route>
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
              <AppContent />
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
