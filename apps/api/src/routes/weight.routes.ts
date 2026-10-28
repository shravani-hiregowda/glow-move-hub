import { Router } from "express";
import { getWeightLogs, createWeightLog, deleteWeightLog } from "../controllers/weight.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/weight-logs", requireAuth, getWeightLogs);
router.post("/weight-logs", requireAuth, createWeightLog);
router.delete("/weight-logs/:id", requireAuth, deleteWeightLog);

export default router;
