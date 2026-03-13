import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/database.types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requiredRole, requireAdmin }: ProtectedRouteProps) => {
  const { user, role, isAdmin, loading } = useAuth();

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
  if (requiredRole && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Role mismatch — redirect to correct dashboard
  if (requiredRole && role && role !== requiredRole) {
    return <Navigate to={role === "business" ? "/business" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};
