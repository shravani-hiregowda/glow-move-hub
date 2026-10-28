import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Moon, Sun, Dumbbell, Menu, X, LogIn, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "@/contexts/AuthContext";

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const navItems = [
  { id: "home", label: "Home" },
  { id: "workouts", label: "Workouts" },
  { id: "tips", label: "Tips" },
  { id: "progress", label: "Progress" },
  { id: "admin", label: "Admin" },
];

export default function Navbar({ isDark, onToggleTheme, activeSection, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const logout = auth?.logout ?? (async () => {});

  const handleNavClick = (id: string) => {
    if (id === "admin") {
      navigate("/admin");
    } else if (id === "progress") {
      navigate("/progress");
    } else if (id === "tips") {
      navigate("/tips");
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
                  activeSection === item.id
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
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border" data-testid="user-profile-badge">
                  <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground uppercase shadow-sm">
                    {((user.name || user.email)[0] || "U").toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground leading-tight" data-testid="user-name">
                      {user.name || user.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-primary font-medium leading-tight uppercase">
                      {user.role}
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={() => logout()}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-all"
                  title={`Signed in as ${user.name || user.email} (${user.email})`}
                >
                  <LogOut className="w-3.5 h-3.5 text-muted-foreground" /> Sign Out
                </motion.button>
              </div>
            ) : (
              <motion.button
                onClick={() => navigate("/login")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground neon-glow text-xs font-semibold transition-all"
                title="Sign In"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
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
            {user && (
              <div className="px-4 py-3 mx-4 my-2 rounded-xl bg-secondary/80 border border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground uppercase shadow-sm">
                    {((user.name || user.email)[0] || "U").toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{user.name || user.email.split("@")[0]}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {user.role}
                </span>
              </div>
            )}

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

              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate("/login");
                    setMobileOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
