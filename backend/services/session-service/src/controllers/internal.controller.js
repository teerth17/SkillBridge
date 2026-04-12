import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as VideoCall from "../models/videocall.model.js";
import * as Session from "../models/session.model.js";
import * as User from "../models/user.model.js";

const PROFILE_URL = process.env.PROFILE_SERVICE_URL || "http://profile-service:4001";

const completedSchema = z.object({
  // Optional: if video-call service knows who should be promoted, it can send it.
  promoteUserId: z.number().int().positive().optional()
});

/**
 * Called by Video Call Service when a call is completed.
 * We promote after the FIRST completed call for the promoted user.
 */
export async function onVideoCallCompleted(req, res, next) {
  try {
    const videoCallId = Number(req.params.videoCallId);
    if (!Number.isFinite(videoCallId)) return fail(res, "Invalid videoCallId", 400);

    const parsed = completedSchema.safeParse(req.body || {});
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const vc = await VideoCall.getVideoCallById(videoCallId);
    if (!vc) return fail(res, "Video call not found", 404);

    const s = await Session.getSessionById(vc.session_id);
    if (!s) return fail(res, "Session not found for video call", 404);

    // Determine promotion target
    let targetUserId = parsed.data.promoteUserId;

    if (!targetUserId) {
      const u1 = await User.getUserRole(s.user1_id);
      const u2 = await User.getUserRole(s.user2_id);
      if (!u1 || !u2) return fail(res, "User(s) not found", 404);

      // If one is mentor and the other is user, promote the user
      if (u1.role === "mentor" && u2.role === "user") targetUserId = u2.user_id;
      else if (u2.role === "mentor" && u1.role === "user") targetUserId = u1.user_id;
      else {
        // If both are users, promote BOTH? (dangerous) — instead promote the non-mentor (none) → require caller to specify.
        return fail(
          res,
          "Promotion target ambiguous (both users). Provide promoteUserId.",
          400
        );
      }
    }

    // Already mentor? then nothing to do
    const roleRow = await User.getUserRole(targetUserId);
    if (!roleRow) return fail(res, "Target user not found", 404);
    if (roleRow.role === "mentor") return ok(res, { promoted: false, reason: "Already mentor" });

    // Call Profile service internal promote endpoint
    const r = await fetch(`${PROFILE_URL}/profiles/${targetUserId}/promote-to-mentor`, {
      method: "POST",
      headers: {
        "X-Internal-Token": process.env.INTERNAL_SERVICE_TOKEN,
      },
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      return fail(res, body?.error?.message || "Profile promotion failed", 502, body);
    }

    return ok(res, { promoted: true, profileResponse: body?.data ?? body });
  } catch (e) {
    return next(e);
  }
}
