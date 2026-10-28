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

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`[JERAI FIT API] Server running on port ${env.PORT} on 0.0.0.0 in ${env.NODE_ENV} mode`);
  console.log("[JERAI FIT API] Security: Session-based Auth & RBAC active");
  void initAdminAccount();
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
