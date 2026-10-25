import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env if present
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .default("postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public"),
    ALLOW_LOCAL_DEV_WRITES: z
      .string()
      .transform((val) => val === "true" || val === "1")
      .default("false"),
    CORS_ORIGIN: z.string().default("http://localhost:8080"),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && data.ALLOW_LOCAL_DEV_WRITES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ALLOW_LOCAL_DEV_WRITES"],
        message:
          "FATAL: ALLOW_LOCAL_DEV_WRITES cannot be enabled in production environments. Writes require Phase 4 authentication.",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\n[Config Error] Invalid server environment configuration:\n${issues}\n`);
  if (process.env.NODE_ENV !== "test") {
    process.exit(1);
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: "test" as const,
      PORT: 3000,
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public",
      ALLOW_LOCAL_DEV_WRITES: false,
      CORS_ORIGIN: "http://localhost:8080",
    };
