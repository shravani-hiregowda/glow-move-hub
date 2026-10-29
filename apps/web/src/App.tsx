import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";

const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const TipsPage = lazy(() => import("./pages/TipsPage.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const ProgressDashboard = lazy(() => import("./pages/ProgressDashboard.tsx"));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase font-display">
          JERAI<span className="text-primary font-black">FIT</span>
        </span>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkoutProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Login />} />
                <Route path="/tips" element={<TipsPage />} />
                <Route element={<ProtectedRoute requireAdmin={false} />}>
                  <Route path="/progress" element={<ProgressDashboard />} />
                </Route>
                <Route element={<ProtectedRoute requireAdmin={true} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </WorkoutProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
