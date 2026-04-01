import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as C from "../controllers/connection.controller.js";

const router = Router();

router.get("/me", requireAuth, C.listMyConnections);
router.post("/", requireAuth, C.createConnection);
router.patch("/:connectionId/status", requireAuth, C.respondToConnection);

export default router;
