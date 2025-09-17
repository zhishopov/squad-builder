import { Router } from "express";
import { requireAuth, requireCoach } from "../../middleware/auth";
import {
  createSquad,
  getSquad,
  addMember,
  getMySquad,
} from "./squads.controller";

const router = Router();

router.post("/squads", requireAuth, requireCoach, createSquad);
router.get("/squads/:id", requireAuth, getSquad);
router.post("/squads/:id/members", requireAuth, requireCoach, addMember);
router.get("/me/squad", requireAuth, getMySquad);

export default router;
