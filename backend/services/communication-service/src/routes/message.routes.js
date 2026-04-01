import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as C from "../controllers/message.controller.js";

const router = Router();

router.get("/sessions/:sessionId/messages", requireAuth, C.getMessages);
router.post("/sessions/:sessionId/messages", requireAuth, C.postMessage);
router.patch("/sessions/:sessionId/read", requireAuth, C.markRead);

export default router;
