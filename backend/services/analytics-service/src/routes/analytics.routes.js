import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as C from "../controllers/analytics.controller.js";

const router = Router();

// Existing
router.get("/dashboard", requireAuth, C.dashboard);
router.get("/platform", requireAuth, C.platformStats);
router.get("/top-mentors", requireAuth, C.topMentors);
router.get("/top-skills", requireAuth, C.topSkills);

// New — UC15: user stats
router.get("/users/:userId/stats", requireAuth, C.userStats);

// New — UC16: mentor stats
router.get("/mentors/:mentorId/stats", requireAuth, C.mentorStats);

// New — badge eligibility (called by Profile Service)
router.get("/users/:userId/badge-eligibility", requireAuth, C.badgeEligibility);

export default router;