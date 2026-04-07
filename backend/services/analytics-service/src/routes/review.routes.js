import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as R from "../controllers/review.controller.js";

const router = Router();

router.post("/:videoCallId/reviews", requireAuth, R.createReview);
router.get("/:videoCallId/reviews", requireAuth, R.getReviews);

export default router;