import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/database.types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

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

  // Role mismatch — redirect to correct dashboard
  if (requiredRole && role && role !== requiredRole) {
    return <Navigate to={role === "business" ? "/business" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};
