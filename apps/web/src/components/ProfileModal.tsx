import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Shield,
  ShieldCheck,
  Check,
  Save,
  Target,
  RefreshCw,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile, switchRole, logout, login } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight ? String(user.targetWeight) : "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setTargetWeight(user.targetWeight ? String(user.targetWeight) : "");
    }
  }, [user, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setIsUpdating(true);
    try {
      const parsedWeight = targetWeight.trim() ? parseFloat(targetWeight) : null;
      await updateProfile({
        name: name.trim(),
        targetWeight: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : null,
      });
      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRoleToggle = async () => {
    const nextRole = user.role === "ADMIN" ? "MEMBER" : "ADMIN";
    setIsSwitchingRole(true);
    try {
      await switchRole(nextRole);
      toast.success(`Role switched to ${nextRole}! UI permissions updated.`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to switch role.");
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleQuickDemoSwitch = async (email: string, pass: string, demoName: string) => {
    setIsSwitchingUser(true);
    try {
      await login(email, pass);
      toast.success(`Logged in as ${demoName}!`);
      onClose();
    } catch {
      toast.error(`Unable to switch to ${demoName}.`);
    } finally {
      setIsSwitchingUser(false);
    }
  };

  const initials = ((user.name || user.email)[0] || "U").toUpperCase();

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg my-auto rounded-3xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 gradient-primary opacity-60 z-10" />

          {/* Sticky Header with Close button */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-lg shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="profile-dialog-title" className="text-lg font-bold text-foreground font-display">
                    {user.name || user.email.split("@")[0]}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      user.role === "ADMIN"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-primary/10 text-primary border border-primary/30"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              id="close-profile-modal-btn"
              aria-label="Close Profile Dialog"
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {/* Role Switching Demonstration Banner */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {user.role === "ADMIN" ? (
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Shield className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Role & Access Control (RBAC)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Current active permissions:{" "}
                      <span className="font-semibold text-foreground">{user.role}</span>
                    </p>
                  </div>
                </div>

                <motion.button
                  onClick={handleRoleToggle}
                  disabled={isSwitchingRole}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                    user.role === "ADMIN"
                      ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                      : "gradient-primary text-primary-foreground neon-glow"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSwitchingRole ? "animate-spin" : ""}`} />
                  {user.role === "ADMIN" ? "Switch to MEMBER" : "Switch to ADMIN"}
                </motion.button>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {user.role === "ADMIN"
                  ? "ADMIN Mode: Access to Workout Catalog Management, Workout Creation, Deletion, and Media Migration."
                  : "MEMBER Mode: Personal Workout Sessions, Progress Tracking, Weight Tracker, and Streaks."}
              </p>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Profile Details
              </h3>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kiran"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/40 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Target Weight (kg)
                </label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="500"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="e.g. 70.0"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/40 border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 px-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 neon-glow hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Profile Details
                  </>
                )}
              </button>
            </form>

            {/* Demo User Quick Switcher */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Quick Demo Switcher
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickDemoSwitch("kiran@jeraifit.com", "Kiran@123", "Kiran (MEMBER)")}
                  disabled={isSwitchingUser}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    user.email === "kiran@jeraifit.com"
                      ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                      : "bg-secondary/40 border-border hover:bg-secondary text-foreground text-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Kiran</span>
                    {user.email === "kiran@jeraifit.com" && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">MEMBER (Progress Demo)</span>
                </button>

                <button
                  onClick={() =>
                    handleQuickDemoSwitch(
                      "shravani.hiregowda9@jeraifit.com",
                      "Shravani@789",
                      "Shravani (ADMIN)"
                    )
                  }
                  disabled={isSwitchingUser}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    user.email === "shravani.hiregowda9@jeraifit.com"
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-400 font-semibold"
                      : "bg-secondary/40 border-border hover:bg-secondary text-foreground text-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Shravani</span>
                    {user.email === "shravani.hiregowda9@jeraifit.com" && (
                      <Check className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">ADMIN (Workout Portal)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Modal Footer with Explicit Dismiss and Sign Out Buttons */}
          <div className="p-4 px-6 bg-secondary/30 border-t border-border flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="text-xs text-destructive hover:underline flex items-center gap-1.5 font-medium"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>

            <button
              type="button"
              onClick={onClose}
              id="dismiss-profile-modal-btn"
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all border border-border cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
