import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from local or monorepo root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });


const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default("postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  STORAGE_DRIVER: z.enum(["local", "s3", "r2"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("uploads"),
  STORAGE_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  TRUST_PROXY: z.string().optional(),
  PROXY_SECRET: z.string().optional(),
  REQUIRE_PROXY_AUTH: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL_PREFIX: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    if (!data.PROXY_SECRET || data.PROXY_SECRET.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PROXY_SECRET"],
        message: "PROXY_SECRET must be configured and non-empty in production.",
      });
    }
  }
});

export { envSchema };

export function parseAndValidateEnv(rawEnv: Record<string, unknown>) {
  return envSchema.safeParse(rawEnv);
}

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
      CORS_ORIGIN: "http://localhost:8080",
      STORAGE_DRIVER: "local" as const,
      STORAGE_LOCAL_DIR: "uploads",
      STORAGE_MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
      TRUST_PROXY: undefined,
      PROXY_SECRET: undefined,
      REQUIRE_PROXY_AUTH: undefined,
      DIRECT_URL: undefined,
      S3_ENDPOINT: undefined,
      S3_REGION: "auto",
      S3_BUCKET: undefined,
      S3_ACCESS_KEY_ID: undefined,
      S3_SECRET_ACCESS_KEY: undefined,
      S3_PUBLIC_URL_PREFIX: undefined,
    };
