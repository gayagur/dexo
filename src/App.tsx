import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { initGA, trackPageView } from "@/lib/analytics";
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
import BusinessOverview from "./pages/business/BusinessOverview";
import BusinessProjects from "./pages/business/BusinessProjects";
import BusinessCustomers from "./pages/business/BusinessCustomers";
import BusinessRevenue from "./pages/business/BusinessRevenue";
import BusinessInsights from "./pages/business/BusinessInsights";
import BrowseBusinesses from "./pages/BrowseBusinesses";
import BusinessProfilePage from "./pages/BusinessProfilePage";
import ProfilePage from "./pages/ProfilePage";
import AuthenticatedHome from "./pages/AuthenticatedHome";
import NewProjectChoice from "./pages/NewProjectChoice";
import SavedDesignsPage from "./pages/SavedDesignsPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PendingCreators from "./pages/admin/PendingCreators";
import ManageCreators from "./pages/admin/ManageCreators";
import ManageClients from "./pages/admin/ManageClients";
import ManageProjects from "./pages/admin/ManageProjects";
import ManageReviews from "./pages/admin/ManageReviews";
import AdminBlogListPage from "./pages/admin/AdminBlogListPage";
import AdminLibraryPage from "./pages/admin/AdminLibraryPage";
import AdminBlogEditorPage from "./pages/admin/AdminBlogEditorPage";
import AdminBlogPreviewPage from "./pages/admin/AdminBlogPreviewPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogPostPage from "./pages/BlogPostPage";
import ChooseRolePage from "./pages/ChooseRolePage";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import { Loader2 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

const queryClient = new QueryClient();

function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    initGA();
  }, []);
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

/** Landing page with auth-aware redirect */
function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {import.meta.env.DEV && !isSupabaseConfigured ? (
        <div
          role="status"
          className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
        >
          <strong className="font-semibold">Supabase env missing.</strong>{" "}
          Copy <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env.example</code> to{" "}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env.local</code> and set{" "}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">VITE_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">VITE_SUPABASE_ANON_KEY</code>, then restart{" "}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">npm run dev</code>.
        </div>
      ) : null}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <HelmetProvider>
        <AnalyticsTracker />
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/choose-role" element={
              <ProtectedRoute>
                <ChooseRolePage />
              </ProtectedRoute>
            } />
            <Route path="/creator/dashboard" element={
              <ProtectedRoute>
                <CreatorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/home" element={
              <ProtectedRoute>
                <AuthenticatedHome />
              </ProtectedRoute>
            } />

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
            <Route path="/new-project" element={
              <ProtectedRoute requiredRole="customer">
                <NewProjectChoice />
              </ProtectedRoute>
            } />
            <Route path="/saved-designs" element={
              <ProtectedRoute requiredRole="customer">
                <SavedDesignsPage />
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
              <ProtectedRoute>
                <BusinessOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/business" element={
              <ProtectedRoute requiredRole="business">
                <BusinessOverview />
              </ProtectedRoute>
            } />
            <Route path="/business/projects" element={
              <ProtectedRoute requiredRole="business">
                <BusinessProjects />
              </ProtectedRoute>
            } />
            <Route path="/business/customers" element={
              <ProtectedRoute requiredRole="business">
                <BusinessCustomers />
              </ProtectedRoute>
            } />
            <Route path="/business/revenue" element={
              <ProtectedRoute requiredRole="business">
                <BusinessRevenue />
              </ProtectedRoute>
            } />
            <Route path="/business/insights" element={
              <ProtectedRoute requiredRole="business">
                <BusinessInsights />
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

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/pending" element={
              <ProtectedRoute requireAdmin>
                <PendingCreators />
              </ProtectedRoute>
            } />
            <Route path="/admin/creators" element={
              <ProtectedRoute requireAdmin>
                <ManageCreators />
              </ProtectedRoute>
            } />
            <Route path="/admin/clients" element={
              <ProtectedRoute requireAdmin>
                <ManageClients />
              </ProtectedRoute>
            } />
            <Route path="/admin/projects" element={
              <ProtectedRoute requireAdmin>
                <ManageProjects />
              </ProtectedRoute>
            } />
            <Route path="/admin/reviews" element={
              <ProtectedRoute requireAdmin>
                <ManageReviews />
              </ProtectedRoute>
            } />
            <Route path="/admin/blog" element={
              <ProtectedRoute requireAdmin>
                <AdminBlogListPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/blog/new" element={
              <ProtectedRoute requireAdmin>
                <AdminBlogEditorPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/blog/preview/:id" element={
              <ProtectedRoute requireAdmin>
                <AdminBlogPreviewPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/blog/:id" element={
              <ProtectedRoute requireAdmin>
                <AdminBlogEditorPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/library" element={
              <ProtectedRoute requireAdmin>
                <AdminLibraryPage />
              </ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </HelmetProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
