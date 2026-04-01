import express from "express";
import { registerUser, loginUser, getProfile, listUsers } from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/signin", loginUser);

// Protected routes
router.get("/profile", authenticate, getProfile);
router.get("/all", authenticate, listUsers);

export default router;
