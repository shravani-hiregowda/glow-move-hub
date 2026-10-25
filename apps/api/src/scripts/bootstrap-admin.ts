import dotenv from "dotenv";
dotenv.config();

import { emailSchema, passwordSchema } from "@jerai/shared";
import { prisma } from "../db/client";
import { hashPassword } from "../utils/password";


export async function bootstrapAdmin(): Promise<void> {
  const rawEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!rawEmail || !rawPassword) {
    console.error(
      "\n[Admin Bootstrap Error] Missing required environment variables:\n" +
        "  - ADMIN_EMAIL: must be a valid email address\n" +
        "  - ADMIN_PASSWORD: must be at least 8 characters\n\n" +
        "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=YourSecurePass123! npm run admin:bootstrap\n"
    );
    process.exit(1);
  }

  const emailParsed = emailSchema.safeParse(rawEmail);
  if (!emailParsed.success) {
    console.error(`\n[Admin Bootstrap Error] Invalid ADMIN_EMAIL: ${emailParsed.error.issues[0]?.message}`);
    process.exit(1);
  }

  const passwordParsed = passwordSchema.safeParse(rawPassword);
  if (!passwordParsed.success) {
    console.error(`\n[Admin Bootstrap Error] Invalid ADMIN_PASSWORD: ${passwordParsed.error.issues[0]?.message}`);
    process.exit(1);
  }

  const normalizedEmail = emailParsed.data;
  const password = passwordParsed.data;

  // Check if an administrator already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    console.warn(
      `\n[Admin Bootstrap] Notice: An administrator account already exists in the database (${existingAdmin.email}).\n` +
        "Refusing to overwrite or reset credentials automatically. Bootstrap aborted safely.\n"
    );
    return;
  }

  // Check if target email exists as non-admin
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    console.warn(
      `\n[Admin Bootstrap] Notice: An account with email ${normalizedEmail} already exists with role ${existingUser.role}.\n` +
        "Refusing to overwrite account unexpectedly. Bootstrap aborted safely.\n"
    );
    return;
  }

  console.log(`[Admin Bootstrap] Creating initial administrator account for ${normalizedEmail}...`);
  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`[Admin Bootstrap] Successfully created initial administrator account.`);
  console.log(`[Admin Bootstrap] User ID: ${admin.id} | Email: ${admin.email} | Role: ${admin.role}\n`);
}

if (process.env.NODE_ENV !== "test") {
  bootstrapAdmin()
    .catch((err) => {
      console.error("[Admin Bootstrap] Unexpected failure:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
