import { app } from "./app";
import { env } from "./config/env";
import { disconnectDatabase } from "./db/client";

const server = app.listen(env.PORT, () => {
  console.log(`[JERAI FIT API] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`[JERAI FIT API] Local dev writes: ${env.ALLOW_LOCAL_DEV_WRITES ? "ENABLED" : "DISABLED (fail-closed)"}`);
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
