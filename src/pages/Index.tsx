import { useState, useCallback, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";
import { defaultWorkouts, type Workout } from "@/data/workouts";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import WorkoutsSection from "@/components/WorkoutsSection";
import TipsSection from "@/components/TipsSection";
import AdminPanel from "@/components/AdminPanel";
import WorkoutModal from "@/components/WorkoutModal";

type Section = "home" | "workouts" | "tips" | "admin";

export default function Index() {
  const { isDark, toggle } = useTheme();
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [workouts, setWorkouts] = useState<Workout[]>(defaultWorkouts);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const sectionRefs = {
    home: useRef<HTMLDivElement>(null),
    workouts: useRef<HTMLDivElement>(null),
    tips: useRef<HTMLDivElement>(null),
    admin: useRef<HTMLDivElement>(null),
  };

  const navigateTo = useCallback((section: string) => {
    setActiveSection(section as Section);
    sectionRefs[section as Section]?.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleAddWorkout = useCallback((workout: Workout) => {
    setWorkouts((prev) => [workout, ...prev]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar isDark={isDark} onToggleTheme={toggle} activeSection={activeSection} onNavigate={navigateTo} />

      <div ref={sectionRefs.home}>
        <HeroSection onStartWorkout={() => navigateTo("workouts")} workoutCount={workouts.length} />
      </div>

      <FeaturedCarousel workouts={workouts} onSelect={setSelectedWorkout} />

      <div ref={sectionRefs.workouts}>
        <WorkoutsSection workouts={workouts} onSelect={setSelectedWorkout} />
      </div>

      <div ref={sectionRefs.tips}>
        <TipsSection />
      </div>

      <div ref={sectionRefs.admin}>
        <AdminPanel onAddWorkout={handleAddWorkout} />
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border text-center text-sm text-muted-foreground">
        <span className="font-display font-bold text-foreground">JERAI</span>
        <span className="text-primary font-display font-bold">FIT</span>
        <span className="mx-2">·</span>
        © {new Date().getFullYear()} All rights reserved.
      </footer>

      <WorkoutModal workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />
    </div>
  );
}
