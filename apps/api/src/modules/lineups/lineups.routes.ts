import { Router } from "express";
import { requireAuth, requireCoach } from "../../middleware/auth";
import { getLineup, saveLineup } from "./lineups.controller";

const router = Router();

router.post("/fixtures/:id/lineup", requireAuth, requireCoach, saveLineup);
router.get("/fixtures/:id/lineup", requireAuth, getLineup);

export default router;
