import { ok, fail } from "../utils/response.js";
import * as User from "../models/user.model.js";

export async function promoteToMentor(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return fail(res, "Invalid userId", 400);

    const updated = await User.setRoleToMentor(userId);
    if (!updated) return fail(res, "User not found", 404);

    return ok(res, { message: "Promoted to mentor", role: updated.role });
  } catch (err) {
    return next(err);
  }
}
