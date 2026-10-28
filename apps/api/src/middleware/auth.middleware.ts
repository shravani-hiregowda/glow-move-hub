import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db/client";
import {
  SESSION_COOKIE_NAME,
  hashSessionToken,
} from "../utils/session";


/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name?: string | null;
        email: string;
        role: Role;
      };
      session?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */



/**
 * Middleware that inspects the session cookie and attaches authenticated user to req.user.
 * Public requests proceed with req.user undefined.
 */
export async function authenticateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token || typeof token !== "string") {
    req.user = undefined;
    req.session = undefined;
    return next();
  }

  try {
    const tokenHash = hashSessionToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      req.user = undefined;
      req.session = undefined;
      res.clearCookie(SESSION_COOKIE_NAME);
      return next();
    }

    // Check expiration
    if (session.expiresAt <= new Date()) {
      // Clean up expired session asynchronously
      prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      req.user = undefined;
      req.session = undefined;
      res.clearCookie(SESSION_COOKIE_NAME);
      return next();
    }

    req.user = session.user;
    req.session = {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    };

    return next();
  } catch (err) {
    req.user = undefined;
    req.session = undefined;
    return next(err);
  }
}

/**
 * Enforces that a request has a valid authenticated session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required to access this resource.",
      },
    });
    return;
  }
  next();
}

/**
 * Enforces that an authenticated user has one of the allowed roles.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access this resource.",
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Forbidden: role ${req.user.role} is not authorized for this action.`,
        },
      });
      return;
    }

    next();
  };
}
