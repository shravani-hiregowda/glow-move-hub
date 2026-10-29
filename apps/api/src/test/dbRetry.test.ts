import { describe, it, expect, vi } from "vitest";
import { withDbRetry } from "../db/client";

describe("Database Resilience & Cold-Start Retry Utility", () => {
  it("resolves immediately when operation succeeds on first attempt", async () => {
    const mockOp = vi.fn().mockResolvedValue({ id: "user-1", name: "Athlete" });

    const result = await withDbRetry(mockOp, { maxRetries: 2, initialDelayMs: 10 });
    expect(result).toEqual({ id: "user-1", name: "Athlete" });
    expect(mockOp).toHaveBeenCalledTimes(1);
  });

  it("retries on transient P1001 connection error and succeeds on subsequent attempt", async () => {
    const transientError = Object.assign(new Error("Can't reach database server at neon.tech"), {
      code: "P1001",
    });
    const mockOp = vi
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce({ status: "recovered" });

    const result = await withDbRetry(mockOp, { maxRetries: 2, initialDelayMs: 10 });
    expect(result).toEqual({ status: "recovered" });
    expect(mockOp).toHaveBeenCalledTimes(2);
  });

  it("retries on serverless idle terminating connection error", async () => {
    const connError = new Error("terminating connection due to administrator command");
    const mockOp = vi
      .fn()
      .mockRejectedValueOnce(connError)
      .mockResolvedValueOnce(["workout-1", "workout-2"]);

    const result = await withDbRetry(mockOp, { maxRetries: 2, initialDelayMs: 10 });
    expect(result).toEqual(["workout-1", "workout-2"]);
    expect(mockOp).toHaveBeenCalledTimes(2);
  });

  it("does not retry on permanent / validation errors and fails immediately", async () => {
    const validationError = Object.assign(new Error("Unique constraint failed on the fields: (`email`)"), {
      code: "P2002",
    });
    const mockOp = vi.fn().mockRejectedValue(validationError);

    await expect(withDbRetry(mockOp, { maxRetries: 3, initialDelayMs: 10 })).rejects.toThrow(
      "Unique constraint failed"
    );
    expect(mockOp).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all configured retry attempts", async () => {
    const droppedConnError = new Error("Connection terminated unexpectedly");
    const mockOp = vi.fn().mockRejectedValue(droppedConnError);

    await expect(withDbRetry(mockOp, { maxRetries: 2, initialDelayMs: 10 })).rejects.toThrow(
      "Connection terminated unexpectedly"
    );
    expect(mockOp).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
