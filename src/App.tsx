import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ChallengeDetail from "./pages/ChallengeDetail";
import Leaderboard from "./pages/Leaderboard";
import Feed from "./pages/Feed";
import Wallet from "./pages/Wallet";
import Referrals from "./pages/Referrals";
import NotFound from "./pages/NotFound";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { UserManagement } from "@/pages/admin/UserManagement";
import { SubmissionModeration } from "@/pages/admin/SubmissionModeration";
import { ChallengeModeration } from "@/pages/admin/ChallengeModeration";
import { Analytics } from "@/pages/admin/Analytics";
import { ActivityLogs } from "@/pages/admin/ActivityLogs";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import PaymentAnalytics from "@/pages/admin/PaymentAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/challenge/:id" element={<ChallengeDetail />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="submissions" element={<SubmissionModeration />} />
                <Route path="challenges" element={<ChallengeModeration />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="payments" element={<PaymentAnalytics />} />
                <Route path="logs" element={<ActivityLogs />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
