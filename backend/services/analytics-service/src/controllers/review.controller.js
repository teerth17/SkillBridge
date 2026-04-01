import { fail, ok } from "../utils/response.js";
import * as A from "../models/analytics.model.js";

export async function createReview(req, res, next) {
  try {
    const { videoCallId, revieweeId, rating, feedbackText } = req.body;
    const reviewerId = req.user.userId;

    if (!videoCallId || !revieweeId || !rating) {
      return fail(res, "Missing required fields");
    }

    if (reviewerId === revieweeId) {
      return fail(res, "Cannot review yourself");
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

export async function getReviews(req, res, next) {
  try {
    const videoCallId = Number(req.params.videoCallId);

    const reviews = await A.listReviews(videoCallId);

    return ok(res, { reviews });
  } catch (e) {
    next(e);
  }
}