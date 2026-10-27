import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      isProxyVerified?: boolean;
    }
  }
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Avoid early return length timing leak: run dummy timingSafeEqual against self
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Enforces proxy authentication before application routes, rate limiters, or database calls.
 * Fails closed in production if PROXY_SECRET is unconfigured or if the request is unverified.
 */
export function proxyAuthGuard(req: Request, res: Response, next: NextFunction): void {
  const isProduction = env.NODE_ENV === "production";
  const proxySecret = env.PROXY_SECRET;
  const isEnforced = isProduction || env.REQUIRE_PROXY_AUTH === "true";

  // Production fail-closed check: server must be configured with a proxy secret
  if (isProduction && (!proxySecret || proxySecret.trim().length === 0)) {
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_CONFIG_ERROR",
        message: "Proxy authentication is unconfigured on the server.",
      },
    });
    return;
  }

  // Extract incoming X-Proxy-Secret header
  const incomingHeader = req.headers["x-proxy-secret"];
  const incomingSecret = Array.isArray(incomingHeader) ? incomingHeader[0] : incomingHeader;

  if (typeof incomingSecret === "string" && proxySecret && proxySecret.trim().length > 0) {
    if (timingSafeCompare(incomingSecret, proxySecret)) {
      req.isProxyVerified = true;
      return next();
    }
  }

  // Reject direct or unverified requests when enforced (production or explicit requirement)
  if (isEnforced) {
    res.status(403).json({
      success: false,
      error: {
        code: "DIRECT_ACCESS_FORBIDDEN",
        message: "Direct API access is forbidden. Requests must be routed via the application proxy.",
      },
    });
    return;
  }

  // Development & test environments default to unverified pass-through to support local workflows
  req.isProxyVerified = false;
  next();
}
