import { Router } from "express";
import { requireInternal } from "../middlewares/internal.middleware.js";
import * as Internal from "../controllers/internal.controller.js";

const router = Router();

router.post("/profiles/:userId/promote-to-mentor", requireInternal, Internal.promoteToMentor);

export default router;
