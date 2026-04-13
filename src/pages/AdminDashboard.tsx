import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { RefreshCw, ArrowLeft, Edit2, Trash2, Search } from "lucide-react";
import { useWorkoutContext } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import Navbar from "@/components/Navbar";
import WorkoutForm from "@/components/WorkoutForm";
import type { Workout } from "@/data/workouts";
import { defaultWorkouts } from "@/data/workouts";

export default function AdminDashboard() {
  const { isDark, toggle } = useTheme();
  const { workouts, deleteWorkout, addWorkout, updateWorkout } = useWorkoutContext();
  const { logout } = useAuth();
  
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to completely reset all workouts to the default set?")) {
      localStorage.setItem("workouts", JSON.stringify(defaultWorkouts));
      window.location.reload();
    }
  };

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => 
      w.title.toLowerCase().includes(adminSearch.toLowerCase()) || 
      w.description.toLowerCase().includes(adminSearch.toLowerCase())
    );
  }, [workouts, adminSearch]);

  const handleSave = (w: Workout) => {
    if (isAdding) {
      addWorkout(w);
      setIsAdding(false);
    } else if (editingWorkout) {
      updateWorkout(w);
      setEditingWorkout(null);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection="admin" onNavigate={() => {}} />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Admin <span className="text-primary">Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-2">Manage your workout library</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors"
            >
              Log Out
            </button>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </motion.div>

        {(isAdding || editingWorkout) ? (
          <WorkoutForm 
            initialData={editingWorkout || undefined} 
            onSave={handleSave} 
            onCancel={() => { setIsAdding(false); setEditingWorkout(null); }} 
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={handleResetDefaults}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Defaults
                </button>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Add New Workout
                </button>
              </div>
            </div>
            <div className="bg-card glass shadow-sm border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Exercise</th>
                  <th className="px-6 py-4 font-medium">Difficulty</th>
                  <th className="px-6 py-4 font-medium">Body Part</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredWorkouts.map((w) => (
                  <tr key={w.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{w.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{w.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        {w.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{w.bodyPart}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingWorkout(w)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this workout?")) {
                              deleteWorkout(w.id);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredWorkouts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
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
      </main>
    </div>
  );
}
