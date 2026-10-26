import "dotenv/config";
import { runMediaMigration } from "../services/mediaMigration.service";
import { prisma } from "../db/client";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("-d");

  console.log(`[Media Migration] Starting media migration (dryRun=${dryRun})...`);

  try {
    const stats = await runMediaMigration({ dryRun });

    console.log("\n==========================================");
    console.log("       MEDIA MIGRATION SUMMARY            ");
    console.log("==========================================");
    console.log(`Mode:              ${dryRun ? "DRY RUN (No data written)" : "LIVE EXECUTION"}`);
    console.log(`Candidates:        ${stats.candidates}`);
    console.log(`Migrated:          ${stats.migrated}`);
    console.log(`Duplicates reused: ${stats.duplicates}`);
    console.log(`Skipped:           ${stats.skipped}`);
    console.log(`Failed:            ${stats.failed}`);
    console.log(`Preserved sources: ${stats.preservedSources}`);
    console.log("==========================================\n");

    if (stats.details && stats.details.length > 0) {
      console.log("Details:");
      for (const d of stats.details) {
        console.log(` - [${d.status.toUpperCase()}] ${d.workoutTitle} (${d.workoutId}): ${d.reason || ""}`);
      }
    }
  } catch (err) {
    console.error("[Media Migration Error]", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
