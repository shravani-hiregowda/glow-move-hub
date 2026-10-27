import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ requireAdmin = true }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Unauthorized access attempts will be securely rerouted to the login portal
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            You are logged in as a Member ({user?.email}). Administrator privileges are required to manage workouts.
          </p>
          <a
            href="/"
            className="inline-flex px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold neon-glow hover:opacity-90 transition-all text-sm"
          >
            Return to Workouts
          </a>
        </div>
      </div>
    );
  }

  // If authorized, yield access to the wrapped child components
  return <Outlet />;
}
