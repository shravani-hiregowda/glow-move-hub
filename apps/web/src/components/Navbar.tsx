import { useState, useContext, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Moon, Sun, Dumbbell, Menu, X, LogIn, LogOut, UserPlus, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "@/contexts/AuthContext";
import ProfileModal from "@/components/ProfileModal";

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
}

export default function Navbar({ isDark, onToggleTheme, activeSection, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const logout = auth?.logout ?? (async () => {});

  const navItems = useMemo(() => {
    const items = [
      { id: "home", label: "Home" },
      { id: "workouts", label: "Workouts" },
      { id: "tips", label: "Tips" },
    ];
    if (user?.role === "ADMIN") {
      items.push({ id: "admin", label: "Admin" });
    } else {
      items.push({ id: "progress", label: "Progress" });
    }
    return items;
  }, [user?.role]);

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
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.button
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-2.5 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-primary-foreground shadow-sm">
              <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4h10v4h-6v8a3 3 0 0 1-3 3H6v-3h2V4z" />
                <path d="M14 10l5 4-5 4" />
              </svg>
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-foreground">
              JERAI<span className="text-primary font-black">FIT</span>
            </span>
          </motion.button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === item.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-lg bg-secondary/80 border border-border/60 flex items-center justify-center text-foreground hover:text-primary transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border/80 transition-all cursor-pointer text-left shadow-xs"
                  data-testid="user-profile-badge"
                  title="Manage Profile & Role"
                >
                  <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground uppercase shadow-xs">
                    {((user.name || user.email)[0] || "U").toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground leading-tight" data-testid="user-name">
                      {user.name || user.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-primary font-semibold leading-tight uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <motion.button
                  onClick={() => navigate("/register")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border/70 text-foreground text-xs font-semibold transition-all"
                  title="Create Member Account"
                >
                  <UserPlus className="w-3.5 h-3.5 text-primary" /> Sign Up
                </motion.button>
                <motion.button
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all"
                  title="Sign In"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </motion.button>
              </div>
            )}

            <button
              className="md:hidden w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              title="Navigation Menu"
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
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(true);
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-all flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-primary" /> Profile & Role Settings
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      navigate("/register");
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-all flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4 text-primary" /> Sign Up
                  </button>
                  <button
                    onClick={() => {
                      navigate("/login");
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" /> Sign In
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>

    <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
  </>
  );
}
