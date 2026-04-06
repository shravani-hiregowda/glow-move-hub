import workout1 from "@/assets/workout-1.jpg";
import workout2 from "@/assets/workout-2.jpg";
import workout3 from "@/assets/workout-3.jpg";
import workout4 from "@/assets/workout-4.jpg";
import workout5 from "@/assets/workout-5.jpg";
import workout6 from "@/assets/workout-6.jpg";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type BodyPart = "Chest" | "Back" | "Legs" | "Arms" | "Core" | "Full Body" | "Shoulders";

export interface Workout {
  id: string;
  title: string;
  difficulty: Difficulty;
  bodyPart: BodyPart;
  image: string;
  duration: string;
  calories: number;
  videoUrl: string;
  steps: string[];
  description: string;
}

export const defaultWorkouts: Workout[] = [
  {
    id: "1",
    title: "Push-Up Power",
    difficulty: "Beginner",
    bodyPart: "Chest",
    image: workout1,
    duration: "15 min",
    calories: 120,
    videoUrl: "https://www.youtube.com/embed/IODxDxX7oi4",
    description: "Master the classic push-up with perfect form and build upper body strength.",
    steps: [
      "Start in a high plank position with hands shoulder-width apart",
      "Keep your core tight and body in a straight line",
      "Lower your chest to the ground by bending your elbows",
      "Push back up to the starting position",
      "Repeat for 3 sets of 12-15 reps",
    ],
  },
  {
    id: "2",
    title: "Barbell Squats",
    difficulty: "Intermediate",
    bodyPart: "Legs",
    image: workout2,
    duration: "25 min",
    calories: 250,
    videoUrl: "https://www.youtube.com/embed/ultWZbUMPL8",
    description: "Build powerful legs with the king of all exercises.",
    steps: [
      "Position the barbell on your upper back",
      "Stand with feet shoulder-width apart",
      "Lower your hips until thighs are parallel to the floor",
      "Drive through your heels to stand back up",
      "Perform 4 sets of 8-10 reps",
    ],
  },
  {
    id: "3",
    title: "Plank Hold",
    difficulty: "Beginner",
    bodyPart: "Core",
    image: workout3,
    duration: "10 min",
    calories: 80,
    videoUrl: "https://www.youtube.com/embed/ASdvN_XEl_c",
    description: "Strengthen your core with this isometric hold exercise.",
    steps: [
      "Get into a forearm plank position",
      "Keep your body in a straight line from head to heels",
      "Engage your core and glutes",
      "Hold for 30-60 seconds",
      "Rest and repeat 3-4 times",
    ],
  },
  {
    id: "4",
    title: "Bicep Curls",
    difficulty: "Beginner",
    bodyPart: "Arms",
    image: workout4,
    duration: "12 min",
    calories: 90,
    videoUrl: "https://www.youtube.com/embed/ykJmrZ5v0Oo",
    description: "Sculpt your arms with controlled dumbbell curls.",
    steps: [
      "Stand with dumbbells at your sides, palms facing forward",
      "Curl the weights toward your shoulders",
      "Squeeze at the top for a moment",
      "Lower slowly back to starting position",
      "Do 3 sets of 12 reps per arm",
    ],
  },
  {
    id: "5",
    title: "Pull-Ups",
    difficulty: "Advanced",
    bodyPart: "Back",
    image: workout5,
    duration: "20 min",
    calories: 180,
    videoUrl: "https://www.youtube.com/embed/eGo4IYlbE5g",
    description: "The ultimate back builder. Master the pull-up for a V-taper physique.",
    steps: [
      "Grip the bar with hands slightly wider than shoulder-width",
      "Hang with arms fully extended",
      "Pull yourself up until chin clears the bar",
      "Lower yourself slowly back down",
      "Aim for 3 sets of max reps",
    ],
  },
  {
    id: "6",
    title: "Walking Lunges",
    difficulty: "Intermediate",
    bodyPart: "Legs",
    image: workout6,
    duration: "18 min",
    calories: 160,
    videoUrl: "https://www.youtube.com/embed/L8fvypPHRoA",
    description: "Build unilateral leg strength and balance with walking lunges.",
    steps: [
      "Stand tall with feet hip-width apart",
      "Step forward into a lunge, lowering your back knee",
      "Push off your front foot to step forward",
      "Alternate legs as you walk forward",
      "Complete 3 sets of 12 steps per leg",
    ],
  },
];

export const fitnessTips = [
  { icon: "💧", title: "Stay Hydrated", tip: "Drink at least 8 glasses of water daily for optimal performance." },
  { icon: "😴", title: "Rest & Recovery", tip: "Muscles grow during rest. Aim for 7-9 hours of sleep." },
  { icon: "🥗", title: "Nutrition First", tip: "You can't out-train a bad diet. Focus on whole foods." },
  { icon: "🎯", title: "Set Goals", tip: "Track your progress and set achievable milestones." },
  { icon: "🔥", title: "Warm Up", tip: "Always warm up 5-10 minutes before intense workouts." },
  { icon: "📈", title: "Progressive Overload", tip: "Gradually increase weight or reps to keep growing." },
];
