import { Router } from "express";
import { register, login, getMe, logout, getCsrfToken, updateProfile, switchRole } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/auth/register", authRateLimiter, register);
router.post("/auth/login", authRateLimiter, login);
router.get("/auth/me", requireAuth, getMe);
router.patch("/auth/profile", requireAuth, updateProfile);
router.post("/auth/profile", requireAuth, updateProfile);
router.put("/auth/profile", requireAuth, updateProfile);
router.post("/auth/switch-role", requireAuth, switchRole);
router.post("/auth/logout", logout);
router.get("/auth/csrf", getCsrfToken);

export default router;
