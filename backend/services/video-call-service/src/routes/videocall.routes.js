import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as C from "../controllers/videocall.controller.js";

const router = Router();

router.post("/", requireAuth, C.createCall);
router.patch("/:videoCallId/start", requireAuth, C.startCall);
router.patch("/:videoCallId/end", requireAuth, C.endCall);
router.get("/sessions/:sessionId", requireAuth, C.listCallsForSession);

export default router;