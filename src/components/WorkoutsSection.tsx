import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import WorkoutCard from "./WorkoutCard";
import type { Workout, Difficulty, BodyPart } from "@/data/workouts";

const difficulties: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];
const bodyParts: BodyPart[] = ["Chest", "Back", "Legs", "Arms", "Core", "Full Body", "Shoulders"];

interface WorkoutsSectionProps {
  workouts: Workout[];
  onSelect: (w: Workout) => void;
}

export default function WorkoutsSection({ workouts, onSelect }: WorkoutsSectionProps) {
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<Difficulty | "">("");
  const [bodyFilter, setBodyFilter] = useState<BodyPart | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return workouts.filter((w) => {
      const matchSearch = w.title.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase());
      const matchDiff = !diffFilter || w.difficulty === diffFilter;
      const matchBody = !bodyFilter || w.bodyPart === bodyFilter;
      return matchSearch && matchDiff && matchBody;
    });
  }, [workouts, search, diffFilter, bodyFilter]);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Explore <span className="text-primary">Workouts</span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">Find the perfect workout for your fitness goals</p>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        className="mb-8 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
            />
          </div>
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-2xl border transition-all flex items-center gap-2 ${
              showFilters ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-border text-foreground"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl glass border border-border space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Difficulty</label>
                  <div className="flex flex-wrap gap-2">
                    <Chip label="All" active={diffFilter === ""} onClick={() => setDiffFilter("")} />
                    {difficulties.map((d) => (
                      <Chip key={d} label={d} active={diffFilter === d} onClick={() => setDiffFilter(d)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Body Part</label>
                  <div className="flex flex-wrap gap-2">
                    <Chip label="All" active={bodyFilter === ""} onClick={() => setBodyFilter("")} />
                    {bodyParts.map((b) => (
                      <Chip key={b} label={b} active={bodyFilter === b} onClick={() => setBodyFilter(b)} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Grid */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((w, i) => (
            <WorkoutCard key={w.id} workout={w} index={i} onClick={() => onSelect(w)} />
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 text-muted-foreground"
        >
          <p className="text-lg">No workouts found. Try different filters!</p>
        </motion.div>
      )}
    </section>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        active
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-foreground/20"
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  );
}
