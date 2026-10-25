import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function writeGuard(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // Refuse writes in production without production auth
  if (env.NODE_ENV === "production") {
    res.status(403).json({
      success: false,
      error: {
        code: "WRITES_DISABLED_PRODUCTION",
        message:
          "Write operations are disabled pending Phase 4 authentication. Production writes require verified credentials.",
      },
    });
    return;
  }

  // In non-production, only allow if explicit flag is enabled
  if (!env.ALLOW_LOCAL_DEV_WRITES) {
    res.status(403).json({
      success: false,
      error: {
        code: "WRITES_DISABLED",
        message:
          "Write operations (POST, PUT, DELETE) are disabled pending Phase 4 authentication. To enable temporary local development writes, set ALLOW_LOCAL_DEV_WRITES=true.",
      },
    });
    return;
  }

  next();
}
