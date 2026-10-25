import { Router } from "express";
import { register, login, getMe, logout, getCsrfToken } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/auth/register", authRateLimiter, register);
router.post("/auth/login", authRateLimiter, login);
router.get("/auth/me", requireAuth, getMe);
router.post("/auth/logout", logout);
router.get("/auth/csrf", getCsrfToken);

export default router;
