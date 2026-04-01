import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as C from "../controllers/search.controller.js";

const router = Router();

router.get("/mentors", requireAuth, C.searchMentors);
router.get("/skills/autocomplete", requireAuth, C.autocompleteSkills);

export default router;