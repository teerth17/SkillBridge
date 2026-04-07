import { z } from "zod";
import { fail, ok } from "../utils/response.js";
import * as A from "../models/analytics.model.js";

const createReviewSchema = z.object({
  videoCallId: z.number().int().positive(),
  revieweeId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  feedbackText: z.string().max(5000).optional(),
});

// POST /analytics/:videoCallId/reviews
export async function createReview(req, res, next) {
  try {
    const parsed = createReviewSchema.safeParse({
      ...req.body,
      videoCallId: Number(req.params.videoCallId),
    });

    if (!parsed.success) {
      return fail(res, "Invalid input", 400, parsed.error.flatten());
    }

    const { videoCallId, revieweeId, rating, feedbackText } = parsed.data;
    const reviewerId = req.user.userId;

    if (reviewerId === revieweeId) {
      return fail(res, "Cannot review yourself", 400);
    }

    const review = await A.createReview({
      videoCallId,
      reviewerId,
      revieweeId,
      rating,
      feedbackText,
    });

    return ok(res, { review }, 201);
  } catch (e) {
    next(e);
  }
}

// GET /analytics/:videoCallId/reviews
export async function getReviews(req, res, next) {
  try {
    const videoCallId = Number(req.params.videoCallId);
    if (!Number.isFinite(videoCallId)) return fail(res, "Invalid videoCallId", 400);

    const reviews = await A.listReviews(videoCallId);
    return ok(res, { reviews });
  } catch (e) {
    next(e);
  }
}