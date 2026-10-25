import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Unauthorized access attempts will be securely rerouted to the login portal
    return <Navigate to="/login" replace />;
  }

  // If authorized, yield access to the wrapped child components
  return <Outlet />;
}
