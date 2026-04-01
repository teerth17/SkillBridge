import { pool } from "../db.js";

export async function createReview({
  videoCallId,
  reviewerId,
  revieweeId,
  rating,
  feedbackText,
}) {
  const r = await pool.query(
    `INSERT INTO "Review"(video_call_id, reviewer_id, reviewee_id, rating, feedback_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING review_id, video_call_id, reviewer_id, reviewee_id, rating, feedback_text, created_at`,
    [videoCallId, reviewerId, revieweeId, rating, feedbackText ?? null]
  );
  return r.rows[0];
}

export async function listReviewsForVideoCall(videoCallId) {
  const r = await pool.query(
    `SELECT review_id, video_call_id, reviewer_id, reviewee_id, rating, feedback_text, created_at
     FROM "Review"
     WHERE video_call_id = $1
     ORDER BY created_at DESC`,
    [videoCallId]
  );
  return r.rows;
}