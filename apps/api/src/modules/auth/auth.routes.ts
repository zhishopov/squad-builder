import { Router } from "express";
import { getCurrentUser, login, logout, signup } from "./auth.controller";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/current-user", getCurrentUser);

export default router;
