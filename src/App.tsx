import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import TipsPage from "./pages/TipsPage.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import HistoryPage from "./pages/HistoryPage.tsx";
const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <WorkoutProvider>
      <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tips" element={<TipsPage />} />
          
          {/* Regular Authenticated Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/history" element={<HistoryPage />} />
          </Route>

          {/* Admin Only Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </WorkoutProvider>
  </AuthProvider>
);

export default App;
