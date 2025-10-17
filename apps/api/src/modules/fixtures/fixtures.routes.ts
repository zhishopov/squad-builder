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

function logAvailabilityRequest(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  try {
    console.log("[AVAILABILITY] incoming", {
      method: req.method,
      url: req.originalUrl,
      contentType: req.headers["content-type"],
      origin: req.headers.origin,
      body: req.body,
      user: (req as { user?: unknown }).user,
    });
  } catch (error) {
    console.log(error);
  }
  next();
}

const router = Router();

router.post("/fixtures", requireAuth, requireCoach, createFixture);
router.get("/fixtures/:id", requireAuth, getFixture);
router.get("/squads/:id/fixtures", requireAuth, listFixturesForSquad);
router.patch("/fixtures/:id", requireAuth, requireCoach, updateFixture);
router.delete("/fixtures/:id", requireAuth, requireCoach, deleteFixture);
router.post(
  "/fixtures/:id/availability",
  logAvailabilityRequest,
  requireAuth,
  setAvailability
);

export default router;
