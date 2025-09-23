import { Router } from "express";
import { requireAuth, requireCoach } from "../../middleware/auth";
import { findUser } from "./users.controller";

const router = Router();

router.post("/users:lookup", requireAuth, requireCoach, findUser);

export default router;
