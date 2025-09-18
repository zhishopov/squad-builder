import { Router } from "express";
import { requireAuth, requireCoach } from "../../middleware/auth";
import {
  createFixture,
  getFixture,
  listFixturesForSquad,
  setAvailability,
} from "./fixtures.controller";

const router = Router();

router.post("/fixtures", requireAuth, requireCoach, createFixture);
router.get("/fixtures/:id", requireAuth, getFixture);
router.get("/squads/:id/fixtures", requireAuth, listFixturesForSquad);
router.post("/fixtures/:id/availability", requireAuth, setAvailability);

export default router;
