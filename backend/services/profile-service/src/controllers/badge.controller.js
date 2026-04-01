import { ok, fail } from "../utils/response.js";
import * as Badge from "../models/badge.model.js";
import * as User from "../models/user.model.js";

export async function getBadges(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return fail(res, "Invalid userId", 400);

    const user = await User.getUserById(userId);
    if (!user) return fail(res, "Profile not found", 404);

    const badges = await Badge.listBadgesForUser(userId);
    return ok(res, { badges });
  } catch (err) {
    return next(err);
  }
}
