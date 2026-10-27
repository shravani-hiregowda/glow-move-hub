import "dotenv/config";
import { rollbackMediaMigration } from "../services/mediaMigration.service";
import { prisma } from "../db/client";

async function main() {
  console.log("[Media Rollback] Starting rollback of migrated media references...");

  try {
    const result = await rollbackMediaMigration();
    console.log(`[Media Rollback] Successfully restored ${result.restoredCount} workout image references to their legacy sources.`);
  } catch (err) {
    console.error("[Media Rollback Error]", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
