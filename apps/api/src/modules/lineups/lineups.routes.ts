import { Router } from "express";
import { requireAuth, requireCoach } from "../../middleware/auth";
import {
  getLineup,
  saveLineup,
  updateLineupStatus,
} from "./lineups.controller";

const router = Router();

router.post("/fixtures/:id/lineup", requireAuth, requireCoach, saveLineup);
router.get("/fixtures/:id/lineup", requireAuth, getLineup);
router.patch(
  "/fixtures/:id/lineup/status",
  requireAuth,
  requireCoach,
  updateLineupStatus
);

export default router;
