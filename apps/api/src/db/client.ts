import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Executes a database operation with exponential backoff retry logic.
 * Gracefully recovers from serverless cold-starts and connection drops (e.g. Neon compute pause).
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; initialDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 2, initialDelayMs = 250, maxDelayMs = 1500 } = options;

  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      const errorMsg = String((err as Error)?.message || "");
      const errorCode = (err as { code?: string })?.code || "";

      const isTransientConnectionError =
        errorCode === "P1001" || // Can't reach database server
        errorCode === "P1017" || // Server has closed the connection
        errorCode === "P2024" || // Connection pool timeout
        errorMsg.includes("terminating connection") ||
        errorMsg.includes("Connection terminated unexpectedly") ||
        errorMsg.includes("Connection lost") ||
        errorMsg.includes("ECONNRESET") ||
        errorMsg.includes("ETIMEDOUT");

      if (isTransientConnectionError && attempt <= maxRetries) {
        if (process.env.NODE_ENV !== "test") {
          console.warn(
            `[Neon DB Resilience] Transient connection error detected (attempt ${attempt}/${maxRetries}): ${
              errorCode || errorMsg
            }. Retrying in ${delay}ms...`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelayMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Database operation failed after retry attempts.");
}

export async function checkDatabaseConnection(): Promise<boolean> {
  return withDbRetry(
    async () => {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    },
    { maxRetries: 2, initialDelayMs: 250 }
  ).catch(() => false);
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect error during shutdown
  }
}

