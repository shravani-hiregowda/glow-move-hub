import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  ShieldCheck,
  Save,
  Target,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile, logout } = useAuth();
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight ? String(user.targetWeight) : "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
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

  if (!isOpen || !user || !mounted) return null;

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const parsedWeight = targetWeight.trim() ? parseFloat(targetWeight) : null;
      await updateProfile({
        name: user.name || user.email.split("@")[0],
        targetWeight: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : null,
      });
      toast.success("Target weight updated successfully!");
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to update target weight.");
    } finally {
      setIsUpdating(false);
    }
  };

  const initials = ((user.name || user.email)[0] || "U").toUpperCase();

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
      >
        {/* Full-screen backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
          aria-hidden="true"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-lg my-auto rounded-3xl bg-card border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* Header Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 gradient-primary opacity-80 z-20" />

          {/* Sticky Modal Header */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-border flex items-center justify-between shrink-0 bg-card z-10">
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
              className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {/* Account Role & Privileges Status Card */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2">
              <div className="flex items-center gap-2.5">
                {user.role === "ADMIN" ? (
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <Shield className="w-5 h-5 text-primary shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {user.role === "ADMIN" ? "Administrator Access" : "Member Account"}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {user.role === "ADMIN"
                      ? "Full administrative permissions to manage workout catalog, upload exercise media, and configure settings."
                      : "Standard membership access to workouts, personal workout history, and progress tracking."}
                  </p>
                </div>
              </div>
            </div>

            {/* Target Weight Goal Setting Form */}
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Fitness Goal (Target Weight)
                </h3>
                {user.targetWeight && (
                  <span className="text-xs font-medium text-muted-foreground">
                    Current Goal: <span className="text-primary font-bold">{user.targetWeight} kg</span>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Target Goal (kg)
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
                <p className="text-[11px] text-muted-foreground mt-1">
                  Powers the reference goal line on the Weight Tracker chart in your Progress tab.
                </p>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 px-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 neon-glow hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating Goal...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Target Goal
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sticky Modal Footer with Sign Out and Close Buttons */}
          <div className="p-4 px-6 bg-secondary/30 border-t border-border flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="text-xs text-destructive hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>

            <button
              type="button"
              onClick={onClose}
              id="dismiss-profile-modal-btn"
              className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-all border border-border cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
