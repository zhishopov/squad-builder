import { Router } from "express";
import { getCurrentUser, login, logout, signup } from "./auth.controller";
import { authLimiter } from "../../middleware/rateLimit";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/current-user", getCurrentUser);

export default router;
