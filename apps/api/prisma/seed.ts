import { PrismaClient } from "@prisma/client";
import { seedWorkouts } from "./seed-data";

const prisma = new PrismaClient();

export async function main() {
  console.log(`[Seed] Starting seed process for ${seedWorkouts.length} default workouts...`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of seedWorkouts) {
    const existing = await prisma.workout.findUnique({
      where: { id: item.id },
      include: { steps: true },
    });

    if (!existing) {
      await prisma.workout.create({
        data: {
          id: item.id,
          title: item.title,
          description: item.description,
          difficulty: item.difficulty,
          bodyPart: item.bodyPart,
          duration: item.duration,
          calories: item.calories,
          videoUrl: item.videoUrl,
          image: item.image,
          steps: {
            create: item.steps.map((instruction: string, index: number) => ({
              stepOrder: index + 1,
              instruction,
            })),
          },
        },
      });
      createdCount++;
    } else {
      // Idempotently update metadata and sync steps
      await prisma.workout.update({
        where: { id: item.id },
        data: {
          title: item.title,
          description: item.description,
          difficulty: item.difficulty,
          bodyPart: item.bodyPart,
          duration: item.duration,
          calories: item.calories,
          videoUrl: item.videoUrl,
          image: item.image,
        },
      });

      // Synchronize steps without deleting other workouts
      await prisma.workoutStep.deleteMany({
        where: { workoutId: item.id },
      });

      await prisma.workoutStep.createMany({
        data: item.steps.map((instruction: string, index: number) => ({
          workoutId: item.id,
          stepOrder: index + 1,
          instruction,
        })),
      });

      updatedCount++;
    }
  }

  console.log(`[Seed] Completed. Created: ${createdCount}, Updated/Verified: ${updatedCount}`);
}

if (process.env.NODE_ENV !== "test") {
  main()
    .catch((e) => {
      console.error("[Seed] Failed to seed database:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
