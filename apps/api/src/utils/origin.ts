import { env } from "../config/env";

/**
 * Validates whether an incoming HTTP Origin or Referer is permitted by CORS and CSRF policy.
 * Supports exact matches from env.CORS_ORIGIN, local development ports,
 * and Cloudflare Pages domains (*.glow-move-hub.pages.dev).
 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) {
    return true; // Server-to-server, curl, non-browser requests
  }

  const allowedOrigins = [
    env.CORS_ORIGIN,
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
  ];

  for (const allowed of allowedOrigins) {
    if (!allowed) continue;
    try {
      if (new URL(allowed).origin === origin) {
        return true;
      }
    } catch {
      if (allowed === origin) {
        return true;
      }
    }
  }

  // Automatically allow Cloudflare Pages canonical and deployment subdomains (*.glow-move-hub.pages.dev)
  try {
    const { hostname } = new URL(origin);
    if (
      hostname === "glow-move-hub.pages.dev" ||
      hostname.endsWith(".glow-move-hub.pages.dev")
    ) {
      return true;
    }

    if (env.CORS_ORIGIN) {
      const configuredHost = new URL(env.CORS_ORIGIN).hostname;
      if (
        configuredHost.endsWith(".pages.dev") &&
        (hostname === configuredHost || hostname.endsWith(`.${configuredHost}`))
      ) {
        return true;
      }
    }
  } catch {
    // Malformed origin URL
  }

  return false;
}
