import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express, { Request, Response } from "express";
import { proxyAuthGuard, timingSafeCompare } from "../middleware/proxyAuth.middleware";
import { parseAndValidateEnv, env } from "../config/env";

describe("Proxy Authentication & Fail-Closed Guard", () => {
  describe("timingSafeCompare helper", () => {
    it("returns true for matching strings", () => {
      expect(timingSafeCompare("secret-token-12345", "secret-token-12345")).toBe(true);
    });

    it("returns false for different strings of identical length", () => {
      expect(timingSafeCompare("secret-token-12345", "secret-token-12346")).toBe(false);
    });

    it("returns false for different strings of different lengths", () => {
      expect(timingSafeCompare("short", "much-longer-string")).toBe(false);
    });

    it("returns false for empty string against non-empty string", () => {
      expect(timingSafeCompare("", "secret")).toBe(false);
    });
  });

  describe("Production Environment Validation", () => {
    it("fails validation if NODE_ENV is production and PROXY_SECRET is missing", () => {
      const result = parseAndValidateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public",
        CORS_ORIGIN: "https://project.pages.dev",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const secretIssue = result.error.issues.find((i) => i.path.includes("PROXY_SECRET"));
        expect(secretIssue).toBeDefined();
        expect(secretIssue?.message).toMatch(/PROXY_SECRET must be configured/i);
      }
    });

    it("fails validation if NODE_ENV is production and PROXY_SECRET is blank/whitespace", () => {
      const result = parseAndValidateEnv({
        NODE_ENV: "production",
        PROXY_SECRET: "   ",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public",
        CORS_ORIGIN: "https://project.pages.dev",
      });

      expect(result.success).toBe(false);
    });

    it("succeeds validation if NODE_ENV is production and PROXY_SECRET is provided", () => {
      const result = parseAndValidateEnv({
        NODE_ENV: "production",
        PROXY_SECRET: "secure-random-token-64-bytes-sample-value",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public",
        CORS_ORIGIN: "https://project.pages.dev",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("proxyAuthGuard HTTP Enforcement", () => {
    let app: express.Express;
    const testSecret = "test-proxy-secret-abc-123";

    beforeEach(() => {
      app = express();
      app.use(proxyAuthGuard);
      app.get("/api/v1/test", (req: Request, res: Response) => {
        res.status(200).json({
          success: true,
          isProxyVerified: req.isProxyVerified,
        });
      });
    });

    afterEach(() => {
      // Restore default test environment settings
      (env as Record<string, unknown>).NODE_ENV = "test";
      (env as Record<string, unknown>).PROXY_SECRET = undefined;
      (env as Record<string, unknown>).REQUIRE_PROXY_AUTH = undefined;
    });

    it("allows direct requests in development/test mode when proxy auth is not enforced", async () => {
      (env as Record<string, unknown>).NODE_ENV = "test";
      (env as Record<string, unknown>).REQUIRE_PROXY_AUTH = undefined;

      const res = await request(app).get("/api/v1/test");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isProxyVerified).toBe(false);
    });

    it("marks isProxyVerified=true when valid X-Proxy-Secret is supplied in test mode", async () => {
      (env as Record<string, unknown>).PROXY_SECRET = testSecret;

      const res = await request(app)
        .get("/api/v1/test")
        .set("X-Proxy-Secret", testSecret);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isProxyVerified).toBe(true);
    });

    it("rejects direct requests with 403 Forbidden when REQUIRE_PROXY_AUTH=true", async () => {
      (env as Record<string, unknown>).REQUIRE_PROXY_AUTH = "true";
      (env as Record<string, unknown>).PROXY_SECRET = testSecret;

      const res = await request(app).get("/api/v1/test");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("DIRECT_ACCESS_FORBIDDEN");
      expect(res.body.error.message).toMatch(/direct api access is forbidden/i);
    });

    it("rejects invalid X-Proxy-Secret with 403 Forbidden when enforced", async () => {
      (env as Record<string, unknown>).REQUIRE_PROXY_AUTH = "true";
      (env as Record<string, unknown>).PROXY_SECRET = testSecret;

      const res = await request(app)
        .get("/api/v1/test")
        .set("X-Proxy-Secret", "wrong-secret-token");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("DIRECT_ACCESS_FORBIDDEN");
    });

    it("fails closed with 500 Server Misconfiguration if in production and PROXY_SECRET is empty", async () => {
      (env as Record<string, unknown>).NODE_ENV = "production";
      (env as Record<string, unknown>).PROXY_SECRET = "";

      const res = await request(app)
        .get("/api/v1/test")
        .set("X-Proxy-Secret", "some-token");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SERVER_CONFIG_ERROR");
    });

    it("allows valid requests in production when correct secret is provided", async () => {
      (env as Record<string, unknown>).NODE_ENV = "production";
      (env as Record<string, unknown>).PROXY_SECRET = testSecret;

      const res = await request(app)
        .get("/api/v1/test")
        .set("X-Proxy-Secret", testSecret);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isProxyVerified).toBe(true);
    });
  });
});
