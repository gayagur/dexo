import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { initGA, trackPageView } from "@/lib/analytics";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageWrapper } from "@/components/PageWrapper";
import { Loader2 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

// ─── Eagerly loaded (landing, auth, home — first paint) ──
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthenticatedHome from "./pages/AuthenticatedHome";
import NotFound from "./pages/NotFound";

// ─── Lazy-loaded (only when navigated to) ────────────────
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const CreateProjectFlow = lazy(() => import("./pages/CreateProjectFlow"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const BusinessOnboarding = lazy(() => import("./pages/BusinessOnboarding"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const BusinessRequestPage = lazy(() => import("./pages/BusinessRequestPage"));
const BusinessConversations = lazy(() => import("./pages/BusinessConversations"));
const BusinessOffersSent = lazy(() => import("./pages/BusinessOffersSent"));
const BusinessOverview = lazy(() => import("./pages/business/BusinessOverview"));
const BusinessProjects = lazy(() => import("./pages/business/BusinessProjects"));
const BusinessCustomers = lazy(() => import("./pages/business/BusinessCustomers"));
const BusinessRevenue = lazy(() => import("./pages/business/BusinessRevenue"));
const BusinessInsights = lazy(() => import("./pages/business/BusinessInsights"));
const BrowseBusinesses = lazy(() => import("./pages/BrowseBusinesses"));
const BusinessProfilePage = lazy(() => import("./pages/BusinessProfilePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NewProjectChoice = lazy(() => import("./pages/NewProjectChoice"));
const SavedDesignsPage = lazy(() => import("./pages/SavedDesignsPage"));
const ChooseRolePage = lazy(() => import("./pages/ChooseRolePage"));
const CreatorDashboard = lazy(() => import("./pages/creator/CreatorDashboard"));
// Admin (heavy — Tiptap, DataTable, etc.)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const PendingCreators = lazy(() => import("./pages/admin/PendingCreators"));
const ManageCreators = lazy(() => import("./pages/admin/ManageCreators"));
const ManageClients = lazy(() => import("./pages/admin/ManageClients"));
const ManageProjects = lazy(() => import("./pages/admin/ManageProjects"));
const ManageReviews = lazy(() => import("./pages/admin/ManageReviews"));
const AdminBlogListPage = lazy(() => import("./pages/admin/AdminBlogListPage"));
const AdminLibraryPage = lazy(() => import("./pages/admin/AdminLibraryPage"));
const AdminBlogEditorPage = lazy(() => import("./pages/admin/AdminBlogEditorPage"));
const AdminBlogPreviewPage = lazy(() => import("./pages/admin/AdminBlogPreviewPage"));
// Blog (public, but not needed on first paint)
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));

const queryClient = new QueryClient();

/** Luxury page skeleton — shimmer effect while lazy routes load */
function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8]">
      <div className="flex flex-col items-center gap-4">
        <div className="text-2xl font-serif font-light text-[#C05621]/30 tracking-wider">DEXO</div>
        <div className="w-8 h-8 border-2 border-[#C05621]/20 border-t-[#C05621] rounded-full animate-spin" />
      </div>
    </div>
  );
}

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
  const { user, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={activeRole === "business" ? "/business" : "/home"} replace />;
  }

  return <LandingPage />;
}

function AuthenticatedHomeRoute() {
  const { activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (activeRole === "business") {
    return <Navigate to="/business" replace />;
  }

  return <AuthenticatedHome />;
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
          <Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="wait">
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
                <AuthenticatedHomeRoute />
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
            <Route path="/settings/become-a-creator" element={
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
          </AnimatePresence>
          </Suspense>
        </AuthProvider>
        </HelmetProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
