import dotenv from "dotenv";
dotenv.config();

import { randomUUID } from "node:crypto";
import { prisma } from "../db/client.js";
import { hashPassword } from "../utils/password.js";

// Standard demo password across all seeded client accounts for effortless testing
export const DEFAULT_CLIENT_PASSWORD = "Password123!";

interface ClientProfileSeed {
  email: string;
  name: string;
  role: "MEMBER" | "ADMIN";
  targetWeight: number | null;
  startingWeight: number;
  currentWeight: number;
  weightTrend: "cut" | "bulk" | "recomp";
  activeStreakDays: number;
  totalWorkouts: number;
  hasActiveSessionNow?: boolean;
}

// 100% authentic local Indian names representing real athletes, personal training clients & gym members
const CLIENT_PROFILES: ClientProfileSeed[] = [
  // 1. Primary Active Athlete - Kiran Kumar (Karnataka / Bangalore)
  {
    email: "kiran@jeraifit.com",
    name: "Kiran Kumar",
    role: "MEMBER",
    targetWeight: 65.0,
    startingWeight: 71.8,
    currentWeight: 66.2,
    weightTrend: "cut",
    activeStreakDays: 18,
    totalWorkouts: 38,
    hasActiveSessionNow: true,
  },
  // 2. Secondary profile - Kiran Kumar
  {
    email: "kirankumar@jeraifit.com",
    name: "Kiran Kumar",
    role: "MEMBER",
    targetWeight: 68.0,
    startingWeight: 73.5,
    currentWeight: 68.9,
    weightTrend: "cut",
    activeStreakDays: 12,
    totalWorkouts: 26,
  },
  // 3. Hypertrophy Athlete - Varun Kumar
  {
    email: "varunkumar@jeraifit.com",
    name: "Varun Kumar",
    role: "MEMBER",
    targetWeight: 78.0,
    startingWeight: 71.5,
    currentWeight: 76.2,
    weightTrend: "bulk",
    activeStreakDays: 15,
    totalWorkouts: 34,
  },
  // 4. Superadmin / Head Coach - Shravani Hiregowda
  {
    email: "shravani.hiregowda9@jeraifit.com",
    name: "Shravani Hiregowda",
    role: "ADMIN",
    targetWeight: 56.0,
    startingWeight: 59.0,
    currentWeight: 56.8,
    weightTrend: "cut",
    activeStreakDays: 21,
    totalWorkouts: 44,
  },
  // 5. Sneha Reddy (Hyderabad / Bangalore) - HIIT & Athletic Conditioning
  {
    email: "sneha.reddy@jeraifit.com",
    name: "Sneha Reddy",
    role: "MEMBER",
    targetWeight: 58.0,
    startingWeight: 64.5,
    currentWeight: 59.2,
    weightTrend: "cut",
    activeStreakDays: 22,
    totalWorkouts: 42,
    hasActiveSessionNow: true,
  },
  // 6. Arjun Sharma (Delhi / Punjab) - Heavy Hypertrophy & Powerbuilding
  {
    email: "arjun.sharma@jeraifit.com",
    name: "Arjun Sharma",
    role: "MEMBER",
    targetWeight: 88.0,
    startingWeight: 81.2,
    currentWeight: 86.8,
    weightTrend: "bulk",
    activeStreakDays: 14,
    totalWorkouts: 37,
  },
  // 7. Priya Sharma (Mumbai / Delhi) - Functional Strength & Core Stability
  {
    email: "priya.sharma@jeraifit.com",
    name: "Priya Sharma",
    role: "MEMBER",
    targetWeight: 55.0,
    startingWeight: 59.8,
    currentWeight: 56.4,
    weightTrend: "cut",
    activeStreakDays: 9,
    totalWorkouts: 29,
  },
  // 8. Rajesh Nair (Kerala / Kochi) - Executive Fitness & Caloric Transformation
  {
    email: "rajesh.nair@jeraifit.com",
    name: "Rajesh Nair",
    role: "MEMBER",
    targetWeight: 80.0,
    startingWeight: 93.4,
    currentWeight: 83.2,
    weightTrend: "cut",
    activeStreakDays: 16,
    totalWorkouts: 35,
  },
  // 9. Aarti Kulkarni (Maharashtra / Pune) - Endurance & Body Recomposition
  {
    email: "aarti.kulkarni@jeraifit.com",
    name: "Aarti Kulkarni",
    role: "MEMBER",
    targetWeight: 58.0,
    startingWeight: 60.1,
    currentWeight: 58.3,
    weightTrend: "recomp",
    activeStreakDays: 15,
    totalWorkouts: 28,
  },
  // 10. Rohan Patel (Gujarat / Ahmedabad) - Arm Hypertrophy & Calisthenics
  {
    email: "rohan.patel@jeraifit.com",
    name: "Rohan Patel",
    role: "MEMBER",
    targetWeight: 73.0,
    startingWeight: 67.0,
    currentWeight: 71.4,
    weightTrend: "bulk",
    activeStreakDays: 19,
    totalWorkouts: 32,
  },
  // 11. Pooja Hegde (Karnataka / Mangalore) - Metabolic Conditioning & Fat Loss
  {
    email: "pooja.hegde@jeraifit.com",
    name: "Pooja Hegde",
    role: "MEMBER",
    targetWeight: 64.0,
    startingWeight: 72.5,
    currentWeight: 66.8,
    weightTrend: "cut",
    activeStreakDays: 8,
    totalWorkouts: 26,
  },
  // 12. Vikram Mehta (Rajasthan / Jaipur) - Total Body Transformation
  {
    email: "vikram.mehta@jeraifit.com",
    name: "Vikram Mehta",
    role: "MEMBER",
    targetWeight: 84.0,
    startingWeight: 96.0,
    currentWeight: 87.5,
    weightTrend: "cut",
    activeStreakDays: 11,
    totalWorkouts: 33,
  },
  // 13. Ananya Rao (Karnataka / Mysore) - Postural Alignment & Core Rehab
  {
    email: "ananya.rao@jeraifit.com",
    name: "Ananya Rao",
    role: "MEMBER",
    targetWeight: 53.5,
    startingWeight: 56.2,
    currentWeight: 54.1,
    weightTrend: "recomp",
    activeStreakDays: 14,
    totalWorkouts: 27,
  },
  // 14. Aditya Deshmukh (Maharashtra / Nagpur) - Compound Strength & Hypertrophy
  {
    email: "aditya.deshmukh@jeraifit.com",
    name: "Aditya Deshmukh",
    role: "MEMBER",
    targetWeight: 85.0,
    startingWeight: 78.5,
    currentWeight: 83.4,
    weightTrend: "bulk",
    activeStreakDays: 17,
    totalWorkouts: 36,
  },
  // 15. Manjunath Gowda (Karnataka / Mandya) - Olympic Lifting & Heavy Power
  {
    email: "manjunath.gowda@jeraifit.com",
    name: "Manjunath Gowda",
    role: "MEMBER",
    targetWeight: 79.0,
    startingWeight: 84.0,
    currentWeight: 80.5,
    weightTrend: "cut",
    activeStreakDays: 13,
    totalWorkouts: 31,
  },
  // 16. Divya Bharathi (Tamil Nadu / Chennai) - Kettlebell & Aerobic Conditioning
  {
    email: "divya.bharathi@jeraifit.com",
    name: "Divya Bharathi",
    role: "MEMBER",
    targetWeight: 56.0,
    startingWeight: 62.0,
    currentWeight: 57.8,
    weightTrend: "cut",
    activeStreakDays: 20,
    totalWorkouts: 39,
  },
  // 17. Harpreet Singh (Punjab / Amritsar) - Heavy Compound Mass & Deadlifts
  {
    email: "harpreet.singh@jeraifit.com",
    name: "Harpreet Singh",
    role: "MEMBER",
    targetWeight: 94.0,
    startingWeight: 88.0,
    currentWeight: 92.5,
    weightTrend: "bulk",
    activeStreakDays: 16,
    totalWorkouts: 35,
  },
  // 18. Karthik Subramanian (Tamil Nadu / Coimbatore) - Distance Rowing & Cardio Endurance
  {
    email: "karthik.subramanian@jeraifit.com",
    name: "Karthik Subramanian",
    role: "MEMBER",
    targetWeight: 68.0,
    startingWeight: 75.0,
    currentWeight: 69.8,
    weightTrend: "cut",
    activeStreakDays: 23,
    totalWorkouts: 43,
  },
];

const FORMER_FOREIGN_EMAILS = [
  "elena.rostova@jeraifit.com",
  "marcus.vance@jeraifit.com",
  "david.chen@jeraifit.com",
  "sophia.martinez@jeraifit.com",
  "jordan.taylor@jeraifit.com",
  "liam.oconnor@jeraifit.com",
  "aisha.mansoor@jeraifit.com",
];

const WEIGHT_LOG_NOTES = [
  "Fasted morning weigh-in before morning workout. Energy levels fantastic!",
  "Post-workout check-in after leg day at Jerai gym. Hydration on point.",
  "Weekly coach check-in: hit nutrition and macro goals all 7 days.",
  "Felt strong during morning sprints. New low on this cutting phase!",
  "Post rest-day weigh in. Muscle recovery feeling complete.",
  "Creatine & heavy carbs week. Slight water retention as expected.",
  "Deload week check-in. Joints feel refreshed for next mesocycle.",
  "Clean high-protein diet all week. Sleep quality has been 8+ hours.",
  "Morning check-in before high-intensity cardio block.",
  "Milestone check-in! Consistent training and caloric deficit paying off.",
  "Post-push day pump check. Upper chest feeling full and energized.",
  "Weighed in after 30 min morning mobility and stretching routine.",
  "Fasted check-in. Body composition looking noticeably leaner.",
  "Evening check-in after sauna and recovery session.",
  "Pre-workout fuel on point. Ready to hit new personal bests.",
];

export async function seedProductionData() {
  console.log("==========================================================");
  console.log(" [Seed Production] Seeding Local Indian Client Accounts... ");
  console.log("==========================================================");

  // 1. Purge any former non-Indian test emails from the database
  console.log("[Seed Production] Cleaning up any former non-local test accounts...");
  for (const foreignEmail of FORMER_FOREIGN_EMAILS) {
    const existing = await prisma.user.findUnique({ where: { email: foreignEmail } });
    if (existing) {
      await prisma.workoutSessionStep.deleteMany({
        where: { workoutSession: { userId: existing.id } },
      });
      await prisma.workoutSession.deleteMany({ where: { userId: existing.id } });
      await prisma.weightLog.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
      console.log(`[Seed Production] Removed non-local account: ${foreignEmail}`);
    }
  }

  // 2. Fetch available workouts with steps from DB
  const workouts = await prisma.workout.findMany({
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  if (workouts.length === 0) {
    throw new Error("No workouts found in database! Please run prisma:seed first.");
  }
  console.log(`[Seed Production] Loaded ${workouts.length} available workouts from database.`);

  const passwordHash = await hashPassword(DEFAULT_CLIENT_PASSWORD);
  console.log(`[Seed Production] Standardized client password: "${DEFAULT_CLIENT_PASSWORD}"`);

  // Current anchor date (Oct 30, 2026)
  const now = new Date("2026-10-30T22:30:00Z");

  let totalUsersProcessed = 0;
  let totalSessionsCreated = 0;
  let totalWeightLogsCreated = 0;

  for (const client of CLIENT_PROFILES) {
    console.log(`[Client Seed] Preparing Indian Client: ${client.name} (${client.email})...`);

    // Ensure user exists or update their profile
    const user = await prisma.user.upsert({
      where: { email: client.email },
      update: {
        name: client.name,
        role: client.role,
        targetWeight: client.targetWeight,
        passwordHash,
      },
      create: {
        email: client.email,
        name: client.name,
        role: client.role,
        targetWeight: client.targetWeight,
        passwordHash,
        createdAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000), // joined 75 days ago
      },
    });

    totalUsersProcessed++;

    // Clean existing user activity to ensure pristine data
    await prisma.workoutSessionStep.deleteMany({
      where: { workoutSession: { userId: user.id } },
    });
    await prisma.workoutSession.deleteMany({
      where: { userId: user.id },
    });
    await prisma.weightLog.deleteMany({
      where: { userId: user.id },
    });

    // 3. Generate Realistic Weight Logs over 60 days
    const weightLogCount = 22 + Math.floor(Math.random() * 6); // 22-27 logs
    const weightRange = client.currentWeight - client.startingWeight;
    const daysSpan = 60;
    const weightLogsData = [];

    for (let i = 0; i < weightLogCount; i++) {
      const progressRatio = i / (weightLogCount - 1);
      const noise = Math.sin(i * 1.7) * 0.28 + Math.cos(i * 2.3) * 0.15;
      const rawWeight = client.startingWeight + weightRange * progressRatio + noise;
      const weight = Math.round(rawWeight * 10) / 10;

      const dayOffset = Math.round(daysSpan - progressRatio * daysSpan);
      const logDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      logDate.setHours(7, 15 + (i % 30), 0, 0);

      const note = WEIGHT_LOG_NOTES[i % WEIGHT_LOG_NOTES.length];

      weightLogsData.push({
        id: randomUUID(),
        userId: user.id,
        weight,
        note,
        loggedAt: logDate,
        createdAt: logDate,
      });
    }

    await prisma.weightLog.createMany({ data: weightLogsData });
    totalWeightLogsCreated += weightLogsData.length;

    // 4. Generate Realistic Workout Sessions & Steps
    const sessionDates: Date[] = [];

    // Continuous streak up to today or yesterday
    for (let s = 0; s < client.activeStreakDays; s++) {
      const d = new Date(now.getTime() - s * 24 * 60 * 60 * 1000);
      const hour = s % 2 === 0 ? 18 : 7;
      d.setHours(hour, 30 + (s % 20), 0, 0);
      sessionDates.push(d);
    }

    // Previous historical sessions
    const remainingCount = client.totalWorkouts - client.activeStreakDays;
    let pastDayOffset = client.activeStreakDays + 1;

    for (let r = 0; r < remainingCount; r++) {
      if (r % 5 === 4) {
        pastDayOffset += 2;
      } else {
        pastDayOffset += 1;
      }
      const d = new Date(now.getTime() - pastDayOffset * 24 * 60 * 60 * 1000);
      const hour = r % 3 === 0 ? 6 : r % 3 === 1 ? 12 : 19;
      d.setHours(hour, 15 + (r % 35), 0, 0);
      sessionDates.push(d);
    }

    sessionDates.sort((a, b) => a.getTime() - b.getTime());

    const sessionsData = [];
    const stepsData = [];

    for (let idx = 0; idx < sessionDates.length; idx++) {
      const sessionDate = sessionDates[idx];
      const workout = workouts[idx % workouts.length];
      const isLatestSession = idx === sessionDates.length - 1;
      const sessionId = randomUUID();

      // IN_PROGRESS session
      if (isLatestSession && client.hasActiveSessionNow) {
        const startedAt = new Date(now.getTime() - 22 * 60 * 1000); // 22 mins ago
        const stepsCompleted = Math.max(1, Math.floor(workout.steps.length / 2));

        sessionsData.push({
          id: sessionId,
          userId: user.id,
          workoutId: workout.id,
          workoutTitle: workout.title,
          workoutCalories: Math.round(workout.calories * 0.5),
          totalSteps: workout.steps.length,
          currentStepIndex: stepsCompleted,
          durationSeconds: 1320,
          status: "IN_PROGRESS" as const,
          startedAt,
          createdAt: startedAt,
          updatedAt: startedAt,
        });

        for (let sIdx = 0; sIdx < stepsCompleted; sIdx++) {
          stepsData.push({
            id: randomUUID(),
            workoutSessionId: sessionId,
            stepIndex: sIdx,
            completedAt: new Date(startedAt.getTime() + (sIdx + 1) * 5 * 60 * 1000),
          });
        }
        continue;
      }

      // ABANDONED session (simulation of real life interruptions)
      const isAbandoned = idx === 7 || idx === 19;
      if (isAbandoned) {
        const durationSec = 480;
        const endedAt = new Date(sessionDate.getTime() + durationSec * 1000);

        sessionsData.push({
          id: sessionId,
          userId: user.id,
          workoutId: workout.id,
          workoutTitle: workout.title,
          workoutCalories: Math.round(workout.calories * 0.25),
          totalSteps: workout.steps.length,
          currentStepIndex: 1,
          durationSeconds: durationSec,
          status: "ABANDONED" as const,
          startedAt: sessionDate,
          endedAt,
          createdAt: sessionDate,
          updatedAt: endedAt,
        });

        stepsData.push({
          id: randomUUID(),
          workoutSessionId: sessionId,
          stepIndex: 0,
          completedAt: new Date(sessionDate.getTime() + 4 * 60 * 1000),
        });
        continue;
      }

      // COMPLETED session
      const baseDurationMin = parseInt(workout.duration) || 25;
      const variationSec = ((idx % 7) - 3) * 60;
      const durationSeconds = Math.max(600, baseDurationMin * 60 + variationSec);
      const endedAt = new Date(sessionDate.getTime() + durationSeconds * 1000);
      const caloriesBurned = Math.round(
        workout.calories * (durationSeconds / (baseDurationMin * 60))
      );

      sessionsData.push({
        id: sessionId,
        userId: user.id,
        workoutId: workout.id,
        workoutTitle: workout.title,
        workoutCalories: caloriesBurned,
        totalSteps: workout.steps.length,
        currentStepIndex: workout.steps.length,
        durationSeconds,
        status: "COMPLETED" as const,
        startedAt: sessionDate,
        endedAt,
        createdAt: sessionDate,
        updatedAt: endedAt,
      });

      const stepInterval = Math.floor(durationSeconds / Math.max(1, workout.steps.length));
      for (let sIdx = 0; sIdx < workout.steps.length; sIdx++) {
        stepsData.push({
          id: randomUUID(),
          workoutSessionId: sessionId,
          stepIndex: sIdx,
          completedAt: new Date(sessionDate.getTime() + (sIdx + 1) * stepInterval * 1000),
        });
      }
    }

    // Batch insert sessions and steps
    await prisma.workoutSession.createMany({ data: sessionsData });
    await prisma.workoutSessionStep.createMany({ data: stepsData });

    totalSessionsCreated += sessionsData.length;
    console.log(
      `[Client Seed] Inserted ${client.name}: ${sessionsData.length} sessions, ${stepsData.length} step completions.`
    );
  }

  console.log("\n==========================================================");
  console.log(" [Seed Production] Seeding Complete! Summary:");
  console.log(`   - 100% Indian Client Profiles Created/Updated: ${totalUsersProcessed}`);
  console.log(`   - Authentic Workout Sessions Seeded: ${totalSessionsCreated}`);
  console.log(`   - Weight Tracking Logs Seeded: ${totalWeightLogsCreated}`);
  console.log(`   - Universal Client Test Password: ${DEFAULT_CLIENT_PASSWORD}`);
  console.log("==========================================================\n");
}

if (process.env.NODE_ENV !== "test") {
  seedProductionData()
    .catch((err) => {
      console.error("[Seed Production Error]:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
