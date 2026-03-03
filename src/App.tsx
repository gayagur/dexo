import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import CreateProjectFlow from "./pages/CreateProjectFlow";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import BusinessOnboarding from "./pages/BusinessOnboarding";
import BusinessDashboard from "./pages/BusinessDashboard";
import BusinessRequestPage from "./pages/BusinessRequestPage";
import BusinessConversations from "./pages/BusinessConversations";
import BusinessOffersSent from "./pages/BusinessOffersSent";
import BrowseBusinesses from "./pages/BrowseBusinesses";
import BusinessProfilePage from "./pages/BusinessProfilePage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

/** Landing page with auth-aware redirect */
function HomeRoute() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={role === "business" ? "/business" : "/dashboard"} replace />;
  }

  return <LandingPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Customer routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="customer">
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-project" element={
              <ProtectedRoute requiredRole="customer">
                <CreateProjectFlow />
              </ProtectedRoute>
            } />
            <Route path="/project/:id" element={
              <ProtectedRoute requiredRole="customer">
                <ProjectDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/browse-businesses" element={
              <ProtectedRoute requiredRole="customer">
                <BrowseBusinesses />
              </ProtectedRoute>
            } />
            <Route path="/business-profile/:id" element={
              <ProtectedRoute requiredRole="customer">
                <BusinessProfilePage />
              </ProtectedRoute>
            } />

            {/* Shared authenticated routes */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* Business routes */}
            <Route path="/business/onboarding" element={
              <ProtectedRoute requiredRole="business">
                <BusinessOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/business" element={
              <ProtectedRoute requiredRole="business">
                <BusinessDashboard />
              </ProtectedRoute>
            } />
            <Route path="/business/request/:id" element={
              <ProtectedRoute requiredRole="business">
                <BusinessRequestPage />
              </ProtectedRoute>
            } />
            <Route path="/business/conversations" element={
              <ProtectedRoute requiredRole="business">
                <BusinessConversations />
              </ProtectedRoute>
            } />
            <Route path="/business/offers" element={
              <ProtectedRoute requiredRole="business">
                <BusinessOffersSent />
              </ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
