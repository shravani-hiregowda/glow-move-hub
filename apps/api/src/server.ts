import { app } from "./app";
import { env } from "./config/env";
import { disconnectDatabase, prisma } from "./db/client";
import { hashPassword } from "./utils/password";

async function initAdminAccount() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "shravani.hiregowda9@jeraifit.com").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Shravani@789";

    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existing) {
      const passwordHash = await hashPassword(adminPassword);
      await prisma.user.create({
        data: {
          name: "Shravani Hiregowda",
          email: adminEmail,
          passwordHash,
          role: "ADMIN",
        },
      });
      console.log(`[JERAI FIT API] Administrator account provisioned: ${adminEmail}`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: "ADMIN",
          name: existing.name || "Shravani Hiregowda",
        },
      });
      console.log(`[JERAI FIT API] Administrator account synchronized: ${adminEmail}`);
    }
  } catch (err) {
    console.error("[JERAI FIT API] Note: Admin initialization skipped or deferred:", err);
  }
}

async function initKiranDemoAccount() {
  try {
    const kiranEmail = "kiran@jeraifit.com";
    let kiran = await prisma.user.findUnique({
      where: { email: kiranEmail },
    });

    if (!kiran) {
      const passwordHash = await hashPassword("Kiran@123");
      kiran = await prisma.user.create({
        data: {
          name: "Kiran",
          email: kiranEmail,
          passwordHash,
          role: "MEMBER",
          targetWeight: 70.0,
        },
      });
      console.log(`[JERAI FIT API] Demo member Kiran provisioned: ${kiranEmail}`);
    } else {
      if (!kiran.name) {
        kiran = await prisma.user.update({
          where: { id: kiran.id },
          data: { name: "Kiran" },
        });
      }
    }

    // Provision baseline weight logs if none exist for Kiran
    const existingLogs = await prisma.weightLog.count({
      where: { userId: kiran.id },
    });

    if (existingLogs === 0) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      await prisma.weightLog.createMany({
        data: [
          {
            userId: kiran.id,
            weight: 75.2,
            note: "Starting fitness journey",
            loggedAt: new Date(now - 28 * dayMs),
          },
          {
            userId: kiran.id,
            weight: 74.5,
            note: "Completed first week",
            loggedAt: new Date(now - 21 * dayMs),
          },
          {
            userId: kiran.id,
            weight: 73.8,
            note: "Steady deficit",
            loggedAt: new Date(now - 14 * dayMs),
          },
          {
            userId: kiran.id,
            weight: 73.1,
            note: "Added HIIT sessions",
            loggedAt: new Date(now - 7 * dayMs),
          },
          {
            userId: kiran.id,
            weight: 72.4,
            note: "Current weigh-in",
            loggedAt: new Date(now),
          },
        ],
      });
      console.log(`[JERAI FIT API] Initial weight logs seeded for Kiran`);
    }

    // Provision baseline workout sessions if none exist for Kiran
    const existingSessions = await prisma.workoutSession.count({
      where: { userId: kiran.id },
    });

    if (existingSessions === 0) {
      const sampleWorkout = await prisma.workout.findFirst();
      if (sampleWorkout) {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        await prisma.workoutSession.createMany({
          data: [
            {
              userId: kiran.id,
              workoutId: sampleWorkout.id,
              workoutTitle: sampleWorkout.title,
              workoutCalories: sampleWorkout.calories || 250,
              durationSeconds: 1500,
              status: "COMPLETED",
              totalSteps: 5,
              startedAt: new Date(now - 3 * dayMs),
              endedAt: new Date(now - 3 * dayMs + 1500 * 1000),
            },
            {
              userId: kiran.id,
              workoutId: sampleWorkout.id,
              workoutTitle: sampleWorkout.title,
              workoutCalories: sampleWorkout.calories || 250,
              durationSeconds: 1800,
              status: "COMPLETED",
              totalSteps: 5,
              startedAt: new Date(now - 2 * dayMs),
              endedAt: new Date(now - 2 * dayMs + 1800 * 1000),
            },
            {
              userId: kiran.id,
              workoutId: sampleWorkout.id,
              workoutTitle: sampleWorkout.title,
              workoutCalories: sampleWorkout.calories || 250,
              durationSeconds: 2100,
              status: "COMPLETED",
              totalSteps: 5,
              startedAt: new Date(now - 1 * dayMs),
              endedAt: new Date(now - 1 * dayMs + 2100 * 1000),
            },
            {
              userId: kiran.id,
              workoutId: sampleWorkout.id,
              workoutTitle: sampleWorkout.title,
              workoutCalories: sampleWorkout.calories || 250,
              durationSeconds: 1200,
              status: "COMPLETED",
              totalSteps: 5,
              startedAt: new Date(now - 2 * 3600 * 1000),
              endedAt: new Date(now - 3600 * 1000),
            },
          ],
        });
        console.log(`[JERAI FIT API] Baseline workout sessions seeded for Kiran`);
      }
    }
  } catch (err) {
    console.error("[JERAI FIT API] Note: Kiran demo initialization skipped or deferred:", err);
  }
}

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`[JERAI FIT API] Server running on port ${env.PORT} on 0.0.0.0 in ${env.NODE_ENV} mode`);
  console.log("[JERAI FIT API] Security: Session-based Auth & RBAC active");
  void initAdminAccount();
  void initKiranDemoAccount();
});

async function handleShutdown(signal: string) {
  console.log(`[JERAI FIT API] Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    await disconnectDatabase();
    console.log("[JERAI FIT API] Server and database connections closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("[JERAI FIT API] Forcefully terminating after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
