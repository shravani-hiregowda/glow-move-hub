import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Key, ArrowRight, ShieldAlert, UserPlus, LogIn, Loader2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/hooks/useTheme";
import { ApiError } from "@/lib/api-client";

export default function Login() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isRegisterMode, setIsRegisterMode] = useState(
    () => location.pathname === "/register" || searchParams.get("mode") === "register"
  );

  useEffect(() => {
    if (location.pathname === "/register" || searchParams.get("mode") === "register") {
      setIsRegisterMode(true);
    }
  }, [location.pathname, searchParams]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Email address is required.");
      return;
    }

    // Automatically append @jeraifit.com if user entered username without domain
    if (!trimmedEmail.includes("@")) {
      trimmedEmail = `${trimmedEmail}@jeraifit.com`;
    } else if (
      !trimmedEmail.endsWith("@jeraifit.com") &&
      !trimmedEmail.endsWith("@example.com")
    ) {
      setErrorMessage("Email address must end with @jeraifit.com");
      return;
    }

    if (isRegisterMode) {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        setErrorMessage("Full name is required (minimum 2 characters).");
        return;
      }
    }

    if (!password) {
      setErrorMessage("Password is required.");
      return;
    }

    if (isRegisterMode && password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const user = await register(trimmedEmail, password, name.trim());
        // Public registrations are MEMBER; redirect to workouts
        navigate(user.role === "ADMIN" ? "/admin" : "/");
      } else {
        const user = await login(trimmedEmail, password);
        if (user.role === "ADMIN") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected authentication error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection="admin" onNavigate={() => {}} />

      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle authentic lighting gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {/* Card */}
          <motion.div
            className="p-8 sm:p-10 rounded-2xl bg-card border border-border/80 soft-shadow relative overflow-hidden"
            animate={errorMessage ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {/* Top border accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary/70" />

            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-xl bg-secondary/80 border border-border/70 flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-1.5">
                {isRegisterMode ? "Create Account" : "Access Portal"}
              </h1>
              <p className="font-body text-muted-foreground text-sm leading-relaxed">
                {isRegisterMode
                  ? "Register a new Member account (@jeraifit.com required)."
                  : "Sign in with your verified member credentials."}
              </p>
            </div>

            {/* Mode switch tabs */}
            <div className="flex p-1 mb-6 rounded-xl bg-secondary/80 border border-border/70">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  !isRegisterMode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  isRegisterMode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                {isRegisterMode && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name (e.g. Varun Kumar)"
                      autoComplete="name"
                      required={isRegisterMode}
                      disabled={isSubmitting}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-secondary transition-all disabled:opacity-50"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-secondary transition-all disabled:opacity-50"
                  />
                </div>

                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegisterMode ? "Password (min. 8 characters)" : "Password"}
                    autoComplete={isRegisterMode ? "new-password" : "current-password"}
                    required
                    disabled={isSubmitting}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-secondary transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <p>{errorMessage}</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all group disabled:opacity-50 disabled:pointer-events-none"
                whileHover={!isSubmitting ? { scale: 1.01 } : {}}
                whileTap={!isSubmitting ? { scale: 0.99 } : {}}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegisterMode ? "Create Member Account" : "Authenticate"}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
