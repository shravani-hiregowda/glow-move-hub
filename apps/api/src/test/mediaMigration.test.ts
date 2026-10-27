import { describe, it, expect, vi, beforeEach } from "vitest";
import { runMediaMigration, rollbackMediaMigration } from "../services/mediaMigration.service";
import { prisma } from "../db/client";
import { getStorageService } from "../services/storage";

vi.mock("../db/client", () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      workout: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      media: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    },
    checkDatabaseConnection: vi.fn(),
    disconnectDatabase: vi.fn(),
  };
});

describe("Media Migration Service", () => {
  const validBase64 = "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAAAfQ//73vw==";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("performs a safe dry-run without writing any database records or storage files", async () => {
    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      {
        id: "w-dry-1",
        title: "Dry Run Test Workout",
        image: validBase64,
      },
    ] as never);

    vi.mocked(prisma.media.findFirst).mockResolvedValue(null);

    const stats = await runMediaMigration({ dryRun: true });

    expect(stats.dryRun).toBe(true);
    expect(stats.candidates).toBe(1);
    expect(stats.migrated).toBe(1);
    expect(stats.failed).toBe(0);

    // Verify no DB mutations occurred
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.media.create).not.toHaveBeenCalled();
    expect(prisma.workout.update).not.toHaveBeenCalled();
  });

  it("migrates valid Base64 image and updates workout with media reference", async () => {
    const mockWorkout = {
      id: "w-b64",
      title: "Base64 Workout",
      image: validBase64,
    };

    vi.mocked(prisma.workout.findMany).mockResolvedValue([mockWorkout] as never);
    vi.mocked(prisma.media.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      return (callback as (tx: unknown) => Promise<unknown>)({
        media: {
          create: vi.fn().mockResolvedValue({
            id: "m-new",
            workoutId: "w-b64",
            objectKey: "workouts/migrated-xyz.webp",
            url: "/api/v1/media/file/workouts/migrated-xyz.webp",
          }),
        },
        workout: {
          update: vi.fn(),
        },
      });
    });

    const stats = await runMediaMigration({ dryRun: false });

    expect(stats.migrated).toBe(1);
    expect(stats.failed).toBe(0);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("skips and preserves external HTTP(S) image URLs per migration policy", async () => {
    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      {
        id: "w-ext",
        title: "External Image Workout",
        image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd",
      },
    ] as never);

    const stats = await runMediaMigration({ dryRun: false });

    expect(stats.candidates).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.preservedSources).toBe(1);
    expect(stats.migrated).toBe(0);
  });

  it("handles duplicate content by reusing existing media and avoiding duplicate storage uploads", async () => {
    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      {
        id: "w-dup",
        title: "Duplicate Workout",
        image: validBase64,
      },
    ] as never);

    // Mock existing media with matching checksum
    vi.mocked(prisma.media.findFirst).mockResolvedValue({
      id: "media-existing",
      checksum: "mock-checksum",
      url: "/api/v1/media/file/workouts/migrated-existing.webp",
      objectKey: "workouts/migrated-existing.webp",
    } as never);

    vi.mocked(prisma.workout.update).mockResolvedValue({} as never);

    const stats = await runMediaMigration({ dryRun: false });

    expect(stats.duplicates).toBe(1);
    expect(stats.migrated).toBe(0);
    expect(prisma.workout.update).toHaveBeenCalledWith({
      where: { id: "w-dup" },
      data: { image: "/api/v1/media/file/workouts/migrated-existing.webp" },
    });
  });

  it("is idempotent: skips workouts that already point to /api/v1/media/", async () => {
    vi.mocked(prisma.workout.findMany).mockResolvedValue([
      {
        id: "w-already",
        title: "Already Migrated",
        image: "/api/v1/media/file/workouts/migrated-123.jpg",
      },
    ] as never);

    const stats = await runMediaMigration({ dryRun: false });

    expect(stats.candidates).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.migrated).toBe(0);
  });

  it("supports rollback: restores workout.image to legacySource", async () => {
    vi.mocked(prisma.media.findMany).mockResolvedValue([
      {
        id: "m-1",
        workoutId: "w-1",
        legacySource: "/assets/workout-1.jpg",
      },
      {
        id: "m-2",
        workoutId: "w-2",
        legacySource: "data:image/webp;base64,orig...",
      },
    ] as never);

    vi.mocked(prisma.workout.update).mockResolvedValue({} as never);

    const result = await rollbackMediaMigration();

    expect(result.restoredCount).toBe(2);
    expect(prisma.workout.update).toHaveBeenCalledTimes(2);
    expect(prisma.workout.update).toHaveBeenCalledWith({
      where: { id: "w-1" },
      data: { image: "/assets/workout-1.jpg" },
    });
  });
});
