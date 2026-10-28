import dotenv from "dotenv";
dotenv.config();

import readline from "node:readline";
import { emailSchema, passwordSchema } from "@jerai/shared";
import { prisma } from "../db/client";
import { hashPassword } from "../utils/password";

async function promptInput(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptHiddenPassword(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    process.stdout.write(query);

    const stdin = process.stdin;
    if (!stdin.isTTY) {
      const rl = readline.createInterface({
        input: stdin,
        output: process.stdout,
      });
      rl.question("", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.removeListener("data", onData);
          stdin.setRawMode(wasRaw ?? false);
          stdin.pause();
          process.stdout.write("\n");
          resolve(password);
          return;
        } else if (char === "\u0003") {
          // Ctrl+C
          stdin.removeListener("data", onData);
          stdin.setRawMode(wasRaw ?? false);
          stdin.pause();
          process.stdout.write("\n");
          process.exit(130);
        } else if (char === "\u0008" || char === "\x7f") {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      }
    };

    stdin.on("data", onData);
    stdin.on("error", (err) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
      reject(err);
    });
  });
}

export async function bootstrapAdmin(options?: { email?: string; password?: string }): Promise<void> {
  // Check if an administrator already exists before prompting
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

  let rawEmail = options?.email || process.env.ADMIN_EMAIL;
  let rawPassword = options?.password || process.env.ADMIN_PASSWORD;

  if (!rawEmail) {
    if (process.stdin.isTTY) {
      rawEmail = await promptInput("Enter Administrator Email: ");
    } else {
      console.error(
        "\n[Admin Bootstrap Error] Missing ADMIN_EMAIL.\n" +
          "Run interactively in a terminal: npm run admin:bootstrap\n" +
          "Or provide ADMIN_EMAIL and ADMIN_PASSWORD in non-interactive environments.\n"
      );
      process.exit(1);
    }
  }

  if (!rawPassword) {
    if (process.stdin.isTTY) {
      rawPassword = await promptHiddenPassword("Enter Administrator Password (hidden): ");
    } else {
      console.error(
        "\n[Admin Bootstrap Error] Missing ADMIN_PASSWORD.\n" +
          "Run interactively in a terminal: npm run admin:bootstrap\n" +
          "Or provide ADMIN_EMAIL and ADMIN_PASSWORD in non-interactive environments.\n"
      );
      process.exit(1);
    }
  }

  const emailParsed = emailSchema.safeParse(rawEmail);
  if (!emailParsed.success) {
    console.error(`\n[Admin Bootstrap Error] Invalid ADMIN_EMAIL: ${emailParsed.error.issues[0]?.message}`);
    process.exit(1);
    return;
  }

  const passwordParsed = passwordSchema.safeParse(rawPassword);
  if (!passwordParsed.success) {
    console.error(`\n[Admin Bootstrap Error] Invalid ADMIN_PASSWORD: ${passwordParsed.error.issues[0]?.message}`);
    process.exit(1);
    return;
  }

  const normalizedEmail = emailParsed.data;
  const password = passwordParsed.data;

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
