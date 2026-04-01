import { Router } from "express";
const router = Router();
import { register, login, validateToken, logout, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

router.post("/register", register);
router.post("/login", login);
router.get("/validate-token", validateToken);
router.post("/logout", requireAuth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
