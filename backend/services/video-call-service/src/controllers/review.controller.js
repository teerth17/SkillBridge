import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as VideoCall from "../models/videocall.model.js";
import * as SessionGate from "../models/session.model.js";
import * as Review from "../models/review.model.js";

const reviewSchema = z.object({
  revieweeId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  feedbackText: z.string().max(5000).optional(),
});

export async function createReview(req, res, next) {
  try {
    const videoCallId = Number(req.params.videoCallId);
    if (!Number.isFinite(videoCallId)) return fail(res, "Invalid videoCallId", 400);

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const call = await VideoCall.getVideoCallById(videoCallId);
    if (!call) return fail(res, "Video call not found", 404);

    if (!call.end_time) return fail(res, "Review allowed only after call ends", 400);

    const v = await SessionGate.validateUserInSession({ token: req.token, sessionId: call.session_id });
    if (!v.ok) return fail(res, v.error, 403);

    const s = v.session;
    const me = req.user.userId;
    const participants = [s.user1_id, s.user2_id];

    if (!participants.includes(parsed.data.revieweeId)) {
      return fail(res, "revieweeId must be a participant", 400);
    }
    if (parsed.data.revieweeId === me) {
      return fail(res, "Cannot review yourself", 400);
    }

    const created = await Review.createReview({
      videoCallId,
      reviewerId: me,
      revieweeId: parsed.data.revieweeId,
      rating: parsed.data.rating,
      feedbackText: parsed.data.feedbackText,
    });

    return ok(res, { review: created }, 201);
  } catch (e) {
    return next(e);
  }
}

export async function listReviews(req, res, next) {
  try {
    const videoCallId = Number(req.params.videoCallId);
    if (!Number.isFinite(videoCallId)) return fail(res, "Invalid videoCallId", 400);

    const call = await VideoCall.getVideoCallById(videoCallId);
    if (!call) return fail(res, "Video call not found", 404);

    const v = await SessionGate.validateUserInSession({ token: req.token, sessionId: call.session_id });
    if (!v.ok) return fail(res, v.error, 403);

    const rows = await Review.listReviewsForVideoCall(videoCallId);
    return ok(res, { reviews: rows });
  } catch (e) {
    return next(e);
  }
}