import { Router } from "express";
import { requireAuth, requireCoach } from "../../middleware/auth";
import {
  createFixture,
  getFixture,
  listFixturesForSquad,
  setAvailability,
  updateFixture,
  deleteFixture,
} from "./fixtures.controller";

const router = Router();

router.post("/fixtures", requireAuth, requireCoach, createFixture);
router.get("/fixtures/:id", requireAuth, getFixture);
router.get("/squads/:id/fixtures", requireAuth, listFixturesForSquad);
router.patch("/fixtures/:id", requireAuth, requireCoach, updateFixture);
router.delete("/fixtures/:id", requireAuth, requireCoach, deleteFixture);
router.post("/fixtures/:id/availability", requireAuth, setAvailability);

export default router;
