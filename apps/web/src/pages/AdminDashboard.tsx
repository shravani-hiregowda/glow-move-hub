import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  ArrowLeft,
  Edit2,
  Trash2,
  Search,
  Dumbbell,
  Lightbulb,
  Server,
  ShieldCheck,
  Plus,
  CheckCircle2,
  Clock,
  Flame,
  Database,
  Cloud,
  Lock,
  Activity,
  ExternalLink,
  Save,
  X,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { useWorkoutContext, FitnessTip } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import Navbar from "@/components/Navbar";
import WorkoutForm from "@/components/WorkoutForm";
import type { Workout } from "@/data/workouts";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

type AdminTab = "workouts" | "tips" | "system";

export default function AdminDashboard() {
  const { isDark, toggle } = useTheme();
  const {
    workouts,
    deleteWorkout,
    addWorkout,
    updateWorkout,
    restoreDefaults,
    storageError,
    mutationError,
    tips,
    addTip,
    updateTip,
    deleteTip,
  } = useWorkoutContext();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("workouts");

  // Workouts State
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");

  // Tips Management State
  const [tipSearch, setTipSearch] = useState("");
  const [tipCategoryFilter, setTipCategoryFilter] = useState<string>("ALL");
  const [isAddingTip, setIsAddingTip] = useState(false);
  const [editingTipIndex, setEditingTipIndex] = useState<number | null>(null);
  const [tipForm, setTipForm] = useState<{ title: string; category: string; tip: string }>({
    title: "",
    category: "Recovery",
    tip: "",
  });

  // System Diagnostics State
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [healthLatency, setHealthLatency] = useState<number | null>(null);
  const [healthTimestamp, setHealthTimestamp] = useState<string | null>(null);

  // Compute stats
  const stats = useMemo(() => {
    const beginner = workouts.filter((w) => w.difficulty.toLowerCase() === "beginner").length;
    const intermediate = workouts.filter((w) => w.difficulty.toLowerCase() === "intermediate").length;
    const advanced = workouts.filter((w) => w.difficulty.toLowerCase() === "advanced").length;
    return { total: workouts.length, beginner, intermediate, advanced, tipsCount: tips?.length || 0 };
  }, [workouts, tips]);

  // Filtered workouts
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const matchesSearch =
        w.title.toLowerCase().includes(adminSearch.toLowerCase()) ||
        w.description.toLowerCase().includes(adminSearch.toLowerCase()) ||
        w.bodyPart.toLowerCase().includes(adminSearch.toLowerCase());
      const matchesDifficulty =
        difficultyFilter === "ALL" || w.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
      return matchesSearch && matchesDifficulty;
    });
  }, [workouts, adminSearch, difficultyFilter]);

  // Filtered tips
  const filteredTips = useMemo(() => {
    return (tips || []).map((tip, index) => ({ tip, originalIndex: index })).filter(({ tip }) => {
      const matchesSearch =
        tip.title.toLowerCase().includes(tipSearch.toLowerCase()) ||
        tip.tip.toLowerCase().includes(tipSearch.toLowerCase());
      const matchesCat =
        tipCategoryFilter === "ALL" ||
        (tip.category && tip.category.toLowerCase() === tipCategoryFilter.toLowerCase());
      return matchesSearch && matchesCat;
    });
  }, [tips, tipSearch, tipCategoryFilter]);

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to completely reset all workouts to the default set?")) {
      restoreDefaults();
    }
  };

  const handleSaveWorkout = (w: Workout) => {
    if (isAddingWorkout) {
      addWorkout(w);
      setIsAddingWorkout(false);
    } else if (editingWorkout) {
      updateWorkout(w);
      setEditingWorkout(null);
    }
  };

  // Tips handlers
  const handleOpenAddTip = () => {
    setTipForm({ title: "", category: "Recovery", tip: "" });
    setEditingTipIndex(null);
    setIsAddingTip(true);
  };

  const handleOpenEditTip = (index: number) => {
    const target = tips[index];
    if (target) {
      setTipForm({
        title: target.title,
        category: target.category || "Recovery",
        tip: target.tip,
      });
      setEditingTipIndex(index);
      setIsAddingTip(true);
    }
  };

  const handleSaveTip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipForm.title.trim() || !tipForm.tip.trim()) {
      toast.error("Please provide both a title and guidance for the tip.");
      return;
    }

    const tipData: FitnessTip = {
      title: tipForm.title.trim(),
      category: tipForm.category.trim(),
      tip: tipForm.tip.trim(),
    };

    if (editingTipIndex !== null) {
      updateTip(editingTipIndex, tipData);
      toast.success("Performance tip updated successfully!");
    } else {
      addTip(tipData);
      toast.success("New performance tip created and synced!");
    }
    setIsAddingTip(false);
    setEditingTipIndex(null);
  };

  const handleDeleteTip = (index: number) => {
    if (window.confirm("Are you sure you want to delete this performance protocol?")) {
      deleteTip(index);
      toast.success("Performance tip removed.");
    }
  };

  // Diagnostics check
  const checkHealth = async () => {
    setHealthStatus("checking");
    const start = performance.now();
    try {
      await api.getHealth();
      const elapsed = Math.round(performance.now() - start);
      setHealthLatency(elapsed);
      setHealthTimestamp(new Date().toLocaleTimeString());
      setHealthStatus("ok");
      toast.success(`API Gateway healthy (${elapsed}ms)`);
    } catch {
      setHealthStatus("error");
      toast.error("API Gateway check failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection="admin" onNavigate={() => {}} />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header with Title and Control Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Superadmin Console
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {user?.email || "admin@jeraifit.com"}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
              Admin <span className="text-primary font-black">Dashboard & Control Center</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your workout library, performance nutrition protocols, and cloud storage diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all cursor-pointer"
            >
              Log Out
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 border border-border transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Member Portal
            </Link>
          </div>
        </motion.div>

        {/* Global Error Banners */}
        {mutationError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium flex items-center gap-2">
            ⚠️ {mutationError}
          </div>
        )}

        {storageError && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
            {storageError}
          </div>
        )}

        {/* Executive KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Workouts Catalog</span>
              <Dumbbell className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-extrabold text-foreground font-display">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="text-emerald-500 font-semibold">{stats.beginner} Beg</span> ·
              <span className="text-amber-500 font-semibold">{stats.intermediate} Int</span> ·
              <span className="text-rose-500 font-semibold">{stats.advanced} Adv</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Performance Tips</span>
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-foreground font-display">{stats.tipsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Live synchronized in user app</div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Cloudflare R2 CDN</span>
              <Cloud className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-extrabold text-foreground font-display">33 Assets</div>
            <div className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> High-speed edge cached
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Security Guard</span>
              <Lock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-foreground font-display">Enforced</div>
            <div className="text-xs text-muted-foreground mt-1">Role-protected endpoints & routes</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setActiveTab("workouts");
              setIsAddingWorkout(false);
              setEditingWorkout(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "workouts"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" /> Workouts Catalog ({stats.total})
          </button>

          <button
            onClick={() => {
              setActiveTab("tips");
              setIsAddingWorkout(false);
              setEditingWorkout(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "tips"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> Nutrition & Tips ({stats.tipsCount})
          </button>

          <button
            onClick={() => {
              setActiveTab("system");
              setIsAddingWorkout(false);
              setEditingWorkout(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "system"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Server className="w-3.5 h-3.5" /> Storage & Diagnostics
          </button>
        </div>

        {/* TAB 1: WORKOUTS CATALOG */}
        {activeTab === "workouts" && (
          <div>
            {isAddingWorkout || editingWorkout ? (
              <WorkoutForm
                initialData={editingWorkout || undefined}
                onSave={handleSaveWorkout}
                onCancel={() => {
                  setIsAddingWorkout(false);
                  setEditingWorkout(null);
                }}
              />
            ) : (
              <>
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search workouts..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm"
                      />
                    </div>

                    <select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-xs font-semibold focus:outline-none"
                    >
                      <option value="ALL">All Levels</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleResetDefaults}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
                    </button>
                    <button
                      onClick={() => setIsAddingWorkout(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-xs cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Workout
                    </button>
                  </div>
                </div>

                <div className="bg-card glass shadow-sm border border-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Exercise</th>
                          <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Difficulty</th>
                          <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Body Part</th>
                          <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Duration / Burn</th>
                          <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredWorkouts.map((w) => (
                          <tr key={w.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {w.image ? (
                                  <img
                                    src={w.image}
                                    alt={w.title}
                                    className="w-12 h-12 rounded-xl object-cover border border-border/60 shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                                    <Dumbbell className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-foreground text-sm">{w.title}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-sm mt-0.5">
                                    {w.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  w.difficulty.toLowerCase() === "beginner"
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : w.difficulty.toLowerCase() === "intermediate"
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                }`}
                              >
                                {w.difficulty}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-foreground">{w.bodyPart}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">
                              {w.duration} · {w.calories} cal
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingWorkout(w)}
                                  className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10 cursor-pointer"
                                  title="Edit Workout"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete "${w.title}"?`)) {
                                      deleteWorkout(w.id);
                                    }
                                  }}
                                  className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 cursor-pointer"
                                  title="Delete Workout"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredWorkouts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              No workouts match your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: NUTRITION & TIPS MANAGEMENT */}
        {activeTab === "tips" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search performance tips..."
                    value={tipSearch}
                    onChange={(e) => setTipSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm"
                  />
                </div>

                <select
                  value={tipCategoryFilter}
                  onChange={(e) => setTipCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Recovery">Recovery</option>
                  <option value="Nutrition">Nutrition</option>
                  <option value="Hydration">Hydration</option>
                  <option value="Training">Training</option>
                  <option value="Mindset">Mindset</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleOpenAddTip}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-xs cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Tip / Protocol
                </button>
              </div>
            </div>

            {/* Tip Authoring Modal / Inline Form */}
            <AnimatePresence>
              {isAddingTip && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 rounded-2xl bg-card border border-primary/40 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      {editingTipIndex !== null ? "Edit Performance Protocol" : "Create New Performance Protocol"}
                    </h3>
                    <button
                      onClick={() => setIsAddingTip(false)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveTip} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Protocol Title
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Creatine Monohydrate Saturation"
                          value={tipForm.title}
                          onChange={(e) => setTipForm({ ...tipForm, title: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                          Category
                        </label>
                        <select
                          value={tipForm.category}
                          onChange={(e) => setTipForm({ ...tipForm, category: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <option value="Recovery">Recovery</option>
                          <option value="Nutrition">Nutrition</option>
                          <option value="Hydration">Hydration</option>
                          <option value="Sleep">Sleep</option>
                          <option value="Training">Training</option>
                          <option value="Mindset">Mindset</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                        Detailed Evidence-Based Guidance
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Detail the biological mechanism, timing window, and practical athletic dosage..."
                        value={tipForm.tip}
                        onChange={(e) => setTipForm({ ...tipForm, tip: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingTip(false)}
                        className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer border border-border"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold cursor-pointer shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Protocol
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tips Table */}
            <div className="bg-card glass shadow-sm border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Protocol / Title</th>
                      <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Guidance Summary</th>
                      <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTips.map(({ tip, originalIndex }) => (
                      <tr key={originalIndex} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                            {tip.title}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            {tip.category || "Guidance"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground max-w-md line-clamp-2 leading-relaxed">
                          {tip.tip}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditTip(originalIndex)}
                              className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10 cursor-pointer"
                              title="Edit Protocol"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTip(originalIndex)}
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 cursor-pointer"
                              title="Delete Protocol"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTips.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                          No performance tips match your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM, STORAGE & DIAGNOSTICS */}
        {activeTab === "system" && (
          <div className="space-y-6">
            {/* Cloudflare R2 Cloud Storage */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground">
                      Cloudflare R2 Storage Infrastructure
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Zero-egress object storage delivering all 33 authenticated exercise photographs.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bucket Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Target Bucket
                  </span>
                  <span className="font-mono font-semibold text-foreground">jerai-fitness-media</span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    CDN Distribution
                  </span>
                  <span className="font-mono font-semibold text-foreground truncate block">
                    pub-2d4e6db5832a4e988243685e8a5bba1a.r2.dev
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Image Quality Policy
                  </span>
                  <span className="font-semibold text-emerald-500">100% Unique Authentic Daylight</span>
                </div>
              </div>
            </div>

            {/* Database & API Diagnostics */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground">
                      Neon Serverless PostgreSQL Database
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Auto-scaling compute hosting User, Workout, Session, WeightLog, and Media tables.
                    </p>
                  </div>
                </div>

                <button
                  onClick={checkHealth}
                  disabled={healthStatus === "checking"}
                  className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5" />
                  {healthStatus === "checking" ? "Pinging..." : "Test Health Ping"}
                </button>
              </div>

              {healthStatus !== "idle" && (
                <div className="p-4 rounded-xl bg-secondary/40 border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        healthStatus === "ok" ? "bg-emerald-500 animate-pulse" : "bg-destructive"
                      }`}
                    />
                    <span className="font-semibold text-foreground">
                      {healthStatus === "ok" ? "API Gateway Responsive & Healthy" : "Connection Timeout"}
                    </span>
                  </div>
                  {healthLatency !== null && (
                    <div className="text-muted-foreground font-mono">
                      Roundtrip: <span className="text-primary font-bold">{healthLatency}ms</span> · Last Checked:{" "}
                      {healthTimestamp}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Security Guard & Route Access Control */}
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    Role-Based Access Control (RBAC) Matrix
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Strict boundary isolation between administrative capabilities and athlete tracking.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden text-xs">
                <div className="p-3.5 bg-secondary/30 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">Admin Portal (`/admin`)</span>
                    <span className="block text-muted-foreground text-[11px] mt-0.5">
                      Workouts CRUD, Media upload, and Tips authoring
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    ADMIN Only
                  </span>
                </div>

                <div className="p-3.5 bg-secondary/30 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">Member Progress Hub (`/progress`)</span>
                    <span className="block text-muted-foreground text-[11px] mt-0.5">
                      Session tracking, calorie burning, and personal target weight
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
                    MEMBER Athletes Only
                  </span>
                </div>

                <div className="p-3.5 bg-secondary/30 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">Public Workouts & Performance Tips</span>
                    <span className="block text-muted-foreground text-[11px] mt-0.5">
                      Browsing catalog, category filters, and evidence-based guidance
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Public (All Users)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
