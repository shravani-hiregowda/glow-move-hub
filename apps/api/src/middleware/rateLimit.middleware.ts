import { Request } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * Resolves the client IP for rate limiting.
 * Critically, CF-Connecting-IP is trusted ONLY when proxyAuthGuard has verified the proxy secret.
 * Direct or unverified requests cannot spoof their rate-limit identifier via forwarded headers.
 */
export function getClientIp(req: Request): string {
  if (req.isProxyVerified) {
    const cfIp = req.headers["cf-connecting-ip"];
    const candidate = Array.isArray(cfIp) ? cfIp[0] : cfIp;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === "production" ? 10 : 100, // 10 in production, generous in development/test
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again later.",
    },
  },
});

export const strictRateLimiterForTest = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again later.",
    },
  },
});
