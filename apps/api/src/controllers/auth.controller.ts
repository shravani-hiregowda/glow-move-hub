import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { registerSchema, loginSchema } from "@jerai/shared";
import { prisma } from "../db/client";
import { env } from "../config/env";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  generateSessionToken,
  hashSessionToken,
  generateCsrfToken,
  getSessionCookieOptions,
  getCsrfCookieOptions,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
} from "../utils/session";

const isProduction = env.NODE_ENV === "production";

// Dummy hash used for constant-time comparison on non-existent users
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$9iKj5X5ZgUfN8Q6D1V4P3g$Y3B0Z2FyYmFnZWhhc2h2YWx1ZXRlc3Rmb3J0aW1pbmc";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Invalid registration input.",
          details: parseResult.error.issues,
        },
      });
      return;
    }

    const { name, email, password } = parseResult.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account with this email address is already registered.",
        },
      });
      return;
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Public registrations are strictly created as MEMBER
    const user = await prisma.user.create({
      data: {
        name: name ? name.trim() : null,
        email,
        passwordHash,
        role: "MEMBER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Establish session
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Issue anti-CSRF token
    const csrfToken = generateCsrfToken();

    res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions(isProduction));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(isProduction));

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        csrfToken,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account with this email address is already registered.",
        },
      });
      return;
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Invalid login input.",
          details: parseResult.error.issues,
        },
      });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Mitigate timing difference
      await verifyPassword(DUMMY_HASH, password);
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
      return;
    }

    const isValidPassword = await verifyPassword(user.passwordHash, password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
      return;
    }

    // Session rotation: revoke previous session if present in cookie
    const oldCookieToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (oldCookieToken && typeof oldCookieToken === "string") {
      const oldHash = hashSessionToken(oldCookieToken);
      await prisma.session.deleteMany({ where: { tokenHash: oldHash } }).catch(() => {});
    }

    // Create fresh session
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const csrfToken = generateCsrfToken();

    res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions(isProduction));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(isProduction));

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        csrfToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Not authenticated.",
      },
    });
    return;
  }

  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(isProduction));
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        targetWeight: req.user.targetWeight,
      },
      csrfToken,
    },
  });
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
      return;
    }

    const { name, targetWeight } = req.body;
    const updateData: { name?: string; targetWeight?: number | null } = {};

    if (typeof name === "string") {
      updateData.name = name.trim();
    }
    if (targetWeight !== undefined) {
      updateData.targetWeight = targetWeight === null ? null : Number(targetWeight);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          targetWeight: updated.targetWeight,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function switchRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
      return;
    }

    const { role } = req.body;
    if (role !== "MEMBER" && role !== "ADMIN") {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Role must be either MEMBER or ADMIN.",
        },
      });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { role },
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          targetWeight: updated.targetWeight,
        },
        message: `Role successfully switched to ${role}.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (token && typeof token === "string") {
      const tokenHash = hashSessionToken(token);
      await prisma.session.deleteMany({
        where: { tokenHash },
      }).catch(() => {});
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });

    res.status(200).json({
      success: true,
      data: {
        message: "Successfully logged out.",
      },
    });
  } catch (err) {
    next(err);
  }
}

export function getCsrfToken(req: Request, res: Response): void {
  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(isProduction));
  }

  res.status(200).json({
    success: true,
    data: {
      csrfToken,
    },
  });
}
