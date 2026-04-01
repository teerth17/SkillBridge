import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as UserSkill from "../models/userSkill.model.js";

const addSkillSchema = z.object({
  skillId: z.number().int().positive(),
  proficiencyLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]).optional(),
  yearsExperience: z.number().nonnegative().optional(),
});

export async function addSkill(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return fail(res, "Invalid userId", 400);
    if (req.user?.userId !== userId) return fail(res, "Forbidden", 403);

    const parsed = addSkillSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const row = await UserSkill.addSkillToUser({
      userId,
      skillId: parsed.data.skillId,
      proficiencyLevel: parsed.data.proficiencyLevel,
      yearsExperience: parsed.data.yearsExperience,
    });

    return ok(res, { userSkill: row }, 201);
  } catch (err) {
    return next(err);
  }
}

export async function removeSkill(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const skillId = Number(req.params.skillId);
    if (!Number.isFinite(userId) || !Number.isFinite(skillId)) return fail(res, "Invalid id", 400);
    if (req.user?.userId !== userId) return fail(res, "Forbidden", 403);

    const removed = await UserSkill.removeSkillFromUser(userId, skillId);
    if (!removed) return fail(res, "Skill not found for user", 404);

    return ok(res, { message: "Skill removed" });
  } catch (err) {
    return next(err);
  }
}
