import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express, { Request, Response } from "express";
import { proxyAuthGuard } from "../middleware/proxyAuth.middleware";
import { strictRateLimiterForTest, getClientIp } from "../middleware/rateLimit.middleware";
import { env } from "../config/env";

describe("Client IP Resolution & Anti-Spoofing Rate Limiting", () => {
  describe("getClientIp helper", () => {
    it("ignores CF-Connecting-IP when req.isProxyVerified is false (direct unauthenticated request)", () => {
      const mockReq = {
        isProxyVerified: false,
        headers: {
          "cf-connecting-ip": "198.51.100.99",
          "x-forwarded-for": "203.0.113.1",
        },
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      } as unknown as Request;

      const resolved = getClientIp(mockReq);
      // Must NOT return the spoofed CF-Connecting-IP
      expect(resolved).toBe("127.0.0.1");
      expect(resolved).not.toBe("198.51.100.99");
    });

    it("trusts CF-Connecting-IP when req.isProxyVerified is true (authenticated Pages Function)", () => {
      const mockReq = {
        isProxyVerified: true,
        headers: {
          "cf-connecting-ip": "203.0.113.42",
        },
        ip: "10.0.0.1",
      } as unknown as Request;

      const resolved = getClientIp(mockReq);
      expect(resolved).toBe("203.0.113.42");
    });

    it("falls back to req.ip if isProxyVerified is true but CF-Connecting-IP header is empty", () => {
      const mockReq = {
        isProxyVerified: true,
        headers: {},
        ip: "10.0.0.2",
      } as unknown as Request;

      const resolved = getClientIp(mockReq);
      expect(resolved).toBe("10.0.0.2");
    });
  });

  describe("Rate Limiter Anti-Spoofing HTTP Integration", () => {
    let app: express.Express;
    const testSecret = "rate-limit-test-secret-xyz";

    beforeEach(() => {
      app = express();
      app.use(proxyAuthGuard);
      app.use("/test-auth", strictRateLimiterForTest); // max 2 requests per window
      app.post("/test-auth", (_req: Request, res: Response) => {
        res.status(200).json({ success: true });
      });

      (env as Record<string, unknown>).PROXY_SECRET = testSecret;
    });

    afterEach(() => {
      (env as Record<string, unknown>).PROXY_SECRET = undefined;
      (env as Record<string, unknown>).REQUIRE_PROXY_AUTH = undefined;
    });

    it("prevents direct requests from bypassing rate limits by spoofing CF-Connecting-IP headers", async () => {
      // In dev/test mode without proxy verification, requests share socket IP.
      // An attacker attempts to rotate spoofed CF-Connecting-IP headers on every request to bypass limits.
      const res1 = await request(app)
        .post("/test-auth")
        .set("CF-Connecting-IP", "1.1.1.1");
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post("/test-auth")
        .set("CF-Connecting-IP", "2.2.2.2");
      expect(res2.status).toBe(200);

      // Third request with a third spoofed IP: should still hit the rate limit because unverified headers are ignored
      const res3 = await request(app)
        .post("/test-auth")
        .set("CF-Connecting-IP", "3.3.3.3");

      expect(res3.status).toBe(429);
      expect(res3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("correctly isolates distinct clients when requests are authenticated by proxy with valid secret", async () => {
      // Client A through trusted proxy
      const resA1 = await request(app)
        .post("/test-auth")
        .set("X-Proxy-Secret", testSecret)
        .set("CF-Connecting-IP", "203.0.113.10");
      expect(resA1.status).toBe(200);

      const resA2 = await request(app)
        .post("/test-auth")
        .set("X-Proxy-Secret", testSecret)
        .set("CF-Connecting-IP", "203.0.113.10");
      expect(resA2.status).toBe(200);

      // Client A hits limit on 3rd request
      const resA3 = await request(app)
        .post("/test-auth")
        .set("X-Proxy-Secret", testSecret)
        .set("CF-Connecting-IP", "203.0.113.10");
      expect(resA3.status).toBe(429);

      // Client B through trusted proxy with distinct CF-Connecting-IP is NOT blocked by Client A's limit
      const resB1 = await request(app)
        .post("/test-auth")
        .set("X-Proxy-Secret", testSecret)
        .set("CF-Connecting-IP", "203.0.113.20");
      expect(resB1.status).toBe(200);
    });
  });
});
