import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/database.types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requiredRole, requireAdmin }: ProtectedRouteProps) => {
  const { user, activeRole, isAdmin, loading } = useAuth();

  // Still loading session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not logged in — send to landing page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Admin gate — redirect non-admins away from admin routes
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  // Role required but not yet resolved — show spinner while it loads
  if (requiredRole && !activeRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Active role mismatch — redirect to correct dashboard
  if (requiredRole && activeRole && activeRole !== requiredRole) {
    return <Navigate to={activeRole === "creator" ? "/creator/dashboard" : activeRole === "business" ? "/business" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};
