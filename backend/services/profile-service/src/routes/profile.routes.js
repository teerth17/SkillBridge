import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as Profile from "../controllers/profile.controller.js";
import * as Skill from "../controllers/skill.controller.js";
import * as Badge from "../controllers/badge.controller.js";
import * as SkillCatalog from "../controllers/skillCatalog.controller.js";
import * as BadgeCatalog from "../controllers/badgeCatalog.controller.js";


const router = Router();

// public
router.get("/:userId", Profile.getProfile);
router.get("/:userId/badges", Badge.getBadges);

// protected (self)
router.put("/:userId", requireAuth, Profile.updateProfile);
router.post("/:userId/skills", requireAuth, Skill.addSkill);
router.delete("/:userId/skills/:skillId", requireAuth, Skill.removeSkill);

router.get("/skills", SkillCatalog.getAllSkills);
router.get("/badges", BadgeCatalog.getAllBadges);

export default router;
