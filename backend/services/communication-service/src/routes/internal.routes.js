import { Router } from "express";
import { requireInternal } from "../middlewares/internal.middleware.js";
import * as I from "../controllers/internal.controller.js";

const router = Router();

router.post("/sessions/:sessionId/connection-accepted", requireInternal, I.connectionAccepted);
router.post("/sessions/:sessionId/video-call-created", requireInternal, I.videoCallCreated);
router.post("/sessions/:sessionId/request-review", requireInternal, I.requestReview);

export default router;
