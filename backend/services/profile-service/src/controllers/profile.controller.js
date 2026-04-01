import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as User from "../models/user.model.js";
import * as UserSkill from "../models/userSkill.model.js";
import * as Badge from "../models/badge.model.js";

export async function getProfile(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return fail(res, "Invalid userId", 400);

    const user = await User.getUserById(userId);
    if (!user) return fail(res, "Profile not found", 404);

    const [skills, badges] = await Promise.all([
      UserSkill.listSkillsForUser(userId),
      Badge.listBadgesForUser(userId),
    ]);

    return ok(res, {
      userId: user.user_id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      profilePicture: user.profile_picture,
      role: user.role,
      experience: user.experience,
      availability: user.availability,
      skills,
      badges,
    });
  } catch (err) {
    return next(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  bio: z.string().max(5000).optional(),
  profilePicture: z.string().max(500).optional(),
  experience: z.string().max(5000).optional(),
  availability: z.string().max(500).optional(),
});

export async function updateProfile(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return fail(res, "Invalid userId", 400);

    // only self can update
    if (req.user?.userId !== userId) return fail(res, "Forbidden", 403);

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const patch = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio;
    if (parsed.data.profilePicture !== undefined) patch.profile_picture = parsed.data.profilePicture;
    if (parsed.data.experience !== undefined) patch.experience = parsed.data.experience;
    if (parsed.data.availability !== undefined) patch.availability = parsed.data.availability;

    const updated = await User.updateUserProfile(userId, patch);
    if (!updated) return fail(res, "Profile not found", 404);

    return ok(res, { profile: updated, message: "Updated" });
  } catch (err) {
    return next(err);
  }
}
