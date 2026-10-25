import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from "../utils/session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe methods do not mutate state
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const allowedOrigins = [
    env.CORS_ORIGIN,
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
  ];

  // 1. Strict Origin / Referer validation for state-changing requests
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin: string | null = null;
  if (typeof originHeader === "string") {
    requestOrigin = originHeader;
  } else if (typeof refererHeader === "string") {
    try {
      const url = new URL(refererHeader);
      requestOrigin = url.origin;
    } catch {
      requestOrigin = null;
    }
  }

  // If an Origin or Referer is supplied, verify it strictly matches allowed origins
  if (requestOrigin) {
    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).origin === requestOrigin;
      } catch {
        return allowed === requestOrigin;
      }
    });

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        error: {
          code: "CSRF_ORIGIN_INVALID",
          message: "Cross-site request rejected: untrusted Origin or Referer.",
        },
      });
      return;
    }
  }

  // 2. Anti-CSRF Token check for cookie-authenticated requests
  // Login and register establish new sessions and do not require existing session CSRF token
  const isAuthInitRoute = req.path.endsWith("/auth/login") || req.path.endsWith("/auth/register");
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (sessionCookie && !isAuthInitRoute) {
    const csrfHeader = req.headers["x-csrf-token"];
    const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];


    if (!csrfHeader || !csrfCookie || typeof csrfHeader !== "string" || typeof csrfCookie !== "string") {
      res.status(403).json({
        success: false,
        error: {
          code: "CSRF_TOKEN_MISSING",
          message: "CSRF token missing from request header or cookie.",
        },
      });
      return;
    }

    const headerBuffer = Buffer.from(csrfHeader);
    const cookieBuffer = Buffer.from(csrfCookie);

    if (headerBuffer.length !== cookieBuffer.length || !crypto.timingSafeEqual(headerBuffer, cookieBuffer)) {
      res.status(403).json({
        success: false,
        error: {
          code: "CSRF_TOKEN_INVALID",
          message: "CSRF token mismatch.",
        },
      });
      return;
    }
  }

  next();
}
