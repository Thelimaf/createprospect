import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignNew from "./pages/CampaignNew";
import CampaignLeadsPage from "./pages/CampaignLeadsPage";
// GoogleMapsLeads removed - leads are accessed via campaigns
import Prospeccao from "./pages/Prospeccao";
import Settings from "./pages/Settings";
import SearchHistory from "./pages/SearchHistory";
import Pricing from "./pages/Pricing";
import Checkout from "./pages/Checkout";
import Billing from "./pages/Billing";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/new" element={<CampaignNew />} />
            {/* Redirect /campaigns/:id to /campaigns/:id/leads */}
            <Route path="/campaigns/:id" element={<Navigate to="leads" replace />} />
            <Route path="/campaigns/:id/leads" element={<CampaignLeadsPage />} />
            {/* google-maps-leads removed - leads accessed via campaigns */}
            <Route path="/prospeccao" element={<Prospeccao />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/searches" element={<SearchHistory />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;