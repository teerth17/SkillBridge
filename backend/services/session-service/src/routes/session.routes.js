import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as S from "../controllers/session.controller.js";

const router = Router();

router.get("/me", requireAuth, S.listMySessions);
router.get("/:sessionId", requireAuth, S.getSession);
router.post("/", requireAuth, S.createOrGetSession);
router.patch("/:sessionId/status", requireAuth, S.updateSessionStatus);

export default router;
