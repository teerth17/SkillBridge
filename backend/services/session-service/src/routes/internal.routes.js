import { Router } from "express";
import { requireInternal } from "../middlewares/internal.middleware.js";
import * as I from "../controllers/internal.controller.js";

const router = Router();

// Video Call Service → Session Service callback
router.post("/video-calls/:videoCallId/completed", requireInternal, I.onVideoCallCompleted);

export default router;
