import { Moon, Sun, Dumbbell, Menu, X, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
}

export default function Navbar({ isDark, onToggleTheme, activeSection, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();

  const baseNavItems = [
    { id: "home", label: "Home" },
    { id: "workouts", label: "Workouts" },
    { id: "tips", label: "Tips" },
  ];

  const authNavItems = isAuthenticated ? [
    { id: "history", label: "History" },
    ...(user?.role === 'admin' ? [{ id: "admin", label: "Admin" }] : [])
  ] : [
    { id: "login", label: "Login" }
  ];

  const navItems = [...baseNavItems, ...authNavItems];

  const handleNavClick = (id: string) => {
    if (id === "admin") {
      navigate("/admin");
    } else if (id === "tips") {
      navigate("/tips");
    } else if (id === "login") {
      navigate("/login");
    } else if (id === "history") {
      navigate("/history");
    } else {
      if (location.pathname !== "/") {
        navigate("/");
        // Note: The user will have to scroll manually since they are navigating back from another page.
      } else {
        onNavigate(id);
      }
    }
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.button
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-2 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center neon-glow">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              JERAI<span className="text-primary">FIT</span>
            </span>
          </motion.button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeSection === item.id || location.pathname.includes(item.id)
                    ? "bg-primary/10 text-primary neon-text"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onToggleTheme}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-primary/10 hover:text-primary transition-all"
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>
            
            {isAuthenticated && (
              <motion.button
                onClick={handleLogout}
                className="hidden md:flex w-10 h-10 rounded-xl bg-destructive/10 text-destructive items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-all"
                title="Logout"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            )}

            <button
              className="md:hidden w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden glass-strong overflow-hidden border-t border-border"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeSection === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all text-destructive hover:bg-destructive/10"
                >
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
