import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as C from "../controllers/analytics.controller.js";

const router = Router();

router.get("/dashboard", requireAuth, C.dashboard);
router.get("/platform", requireAuth, C.platformStats);
router.get("/top-mentors", requireAuth, C.topMentors);
router.get("/top-skills", requireAuth, C.topSkills);

export default router;