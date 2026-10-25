import crypto from "crypto";
import { CookieOptions } from "express";

export const SESSION_COOKIE_NAME = "jerai_session";
export const CSRF_COOKIE_NAME = "jerai_csrf";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  };
}

export function getCsrfCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: false, // Accessible to client-side JavaScript for anti-CSRF headers
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  };
}
