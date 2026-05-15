import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/hooks/useTheme";
import axios from "axios";
import { format } from "date-fns";
import { Activity, Apple, Plus, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const { isDark, toggle } = useTheme();
  const { user } = useAuth();
  const [history, setHistory] = useState<any>({ workoutHistory: [], dietHistory: [] });
  const [loading, setLoading] = useState(true);

  // Form states for adding new history (simplified for demo)
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutCalories, setWorkoutCalories] = useState("");
  
  const [dietMeal, setDietMeal] = useState("");
  const [dietCalories, setDietCalories] = useState("");

  const [isWorkoutOpen, setIsWorkoutOpen] = useState(false);
  const [isDietOpen, setIsDietOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await axios.get("/api/history");
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/history/workout", {
        title: workoutTitle,
        duration: workoutDuration,
        caloriesBurned: parseInt(workoutCalories),
      });
      setIsWorkoutOpen(false);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/history/diet", {
        mealName: dietMeal,
        calories: parseInt(dietCalories),
      });
      setIsDietOpen(false);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center">Please login</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection="history" onNavigate={() => {}} />

      <main className="max-w-6xl mx-auto px-4 py-24">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Your Fitness History
          </h1>
          <p className="text-muted-foreground text-lg">Track your progress and stay consistent.</p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading history...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Workout History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-lg border border-border/50 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-primary">
                  <Activity className="w-6 h-6" />
                  <h2 className="text-2xl font-bold font-display">Workouts</h2>
                </div>
                
                <Dialog open={isWorkoutOpen} onOpenChange={setIsWorkoutOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Add Workout Record</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddWorkout} className="space-y-4 mt-4">
                      <input type="text" placeholder="Workout Title (e.g., Upper Body)" className="w-full p-3 rounded-lg bg-secondary/50 border border-border" value={workoutTitle} onChange={(e) => setWorkoutTitle(e.target.value)} required />
                      <input type="text" placeholder="Duration (e.g., 45 mins)" className="w-full p-3 rounded-lg bg-secondary/50 border border-border" value={workoutDuration} onChange={(e) => setWorkoutDuration(e.target.value)} required />
                      <input type="number" placeholder="Calories Burned" className="w-full p-3 rounded-lg bg-secondary/50 border border-border" value={workoutCalories} onChange={(e) => setWorkoutCalories(e.target.value)} required />
                      <Button type="submit" className="w-full">Save Workout</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {history.workoutHistory?.length === 0 && <p className="text-muted-foreground">No workouts recorded yet.</p>}
                {history.workoutHistory?.map((workout: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-colors">
                    <h3 className="font-semibold text-lg">{workout.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {format(new Date(workout.date), "MMM d, yyyy")}</span>
                      <span>{workout.duration}</span>
                      <span>{workout.caloriesBurned} kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Diet History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 backdrop-blur-lg border border-border/50 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-accent">
                  <Apple className="w-6 h-6" />
                  <h2 className="text-2xl font-bold font-display">Diet Plan</h2>
                </div>
                
                <Dialog open={isDietOpen} onOpenChange={setIsDietOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 border-accent/20 hover:border-accent/50 hover:bg-accent/10">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Add Meal Record</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddDiet} className="space-y-4 mt-4">
                      <input type="text" placeholder="Meal Name (e.g., Chicken Salad)" className="w-full p-3 rounded-lg bg-secondary/50 border border-border" value={dietMeal} onChange={(e) => setDietMeal(e.target.value)} required />
                      <input type="number" placeholder="Total Calories" className="w-full p-3 rounded-lg bg-secondary/50 border border-border" value={dietCalories} onChange={(e) => setDietCalories(e.target.value)} required />
                      <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white">Save Meal</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {history.dietHistory?.length === 0 && <p className="text-muted-foreground">No meals recorded yet.</p>}
                {history.dietHistory?.map((diet: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-accent/30 transition-colors">
                    <h3 className="font-semibold text-lg">{diet.mealName}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {format(new Date(diet.date), "MMM d, yyyy")}</span>
                      <span>{diet.calories} kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
