import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, Key, ArrowRight, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/hooks/useTheme";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "mainAdmin" && password === "mainAdmin@123") {
      setError(false);
      login();
      navigate("/admin");
    } else {
      setError(true);
      // Small timeout to reset the shake animation trigger
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection="admin" onNavigate={() => {}} />

      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />

        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Card */}
          <motion.div 
            className="p-8 sm:p-10 rounded-3xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl relative overflow-hidden"
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {/* Inner glow effect on top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-50" />

            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border shadow-inner flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
                Admin Portal
              </h1>
              <p className="text-muted-foreground text-sm">
                Enter your secure credentials to manage the workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-secondary transition-all"
                  />
                </div>

                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-secondary transition-all"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <p>Invalid username or password. Access denied.</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                className="w-full py-4 mt-2 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 neon-glow hover:opacity-90 transition-all font-display tracking-wide group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Authenticate
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
