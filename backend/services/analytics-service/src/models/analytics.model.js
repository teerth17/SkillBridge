import { pool } from "../db.js";

// USER DASHBOARD
export async function getUserDashboard(userId) {
  const [calls, reviews, skills] = await Promise.all([
    pool.query(`
      SELECT COUNT(*) AS completed_calls
      FROM "VideoCall"
      WHERE mentor_user_id = $1 AND status = 'completed'
    `, [userId]),

    pool.query(`
      SELECT COUNT(*) AS total_reviews,
             COALESCE(AVG(rating), 0) AS avg_rating
      FROM "Review"
      WHERE reviewee_id = $1
    `, [userId]),

    pool.query(`
      SELECT s.skill_name
      FROM "UserSkill" us
      JOIN "Skill" s ON s.skill_id = us.skill_id
      WHERE us.user_id = $1
    `, [userId])
  ]);

  return {
    completedCalls: Number(calls.rows[0].completed_calls),
    totalReviews: Number(reviews.rows[0].total_reviews),
    avgRating: Number(reviews.rows[0].avg_rating),
    skills: skills.rows
  };
}


// PLATFORM STATS
export async function getPlatformStats() {
  const r = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM "User") AS total_users,
      (SELECT COUNT(*) FROM "User" WHERE role = 'mentor') AS total_mentors,
      (SELECT COUNT(*) FROM "VideoCall") AS total_calls,
      (SELECT COUNT(*) FROM "VideoCall" WHERE status = 'completed') AS completed_calls
  `);

  return r.rows[0];
}


// TOP MENTORS
export async function getTopMentors(limit = 5) {
  const r = await pool.query(`
    SELECT
      u.user_id,
      u.name,
      COALESCE(AVG(r.rating), 0) AS avg_rating,
      COUNT(DISTINCT vc.video_call_id) AS completed_calls
    FROM "User" u
    LEFT JOIN "Review" r ON r.reviewee_id = u.user_id
    LEFT JOIN "VideoCall" vc ON vc.mentor_user_id = u.user_id AND vc.status = 'completed'
    WHERE u.role = 'mentor'
    GROUP BY u.user_id
    ORDER BY avg_rating DESC, completed_calls DESC
    LIMIT $1
  `, [limit]);

  return r.rows;
}


// TOP SKILLS
export async function getTopSkills(limit = 5) {
  const r = await pool.query(`
    SELECT
      s.skill_name,
      COUNT(us.user_id) AS user_count
    FROM "Skill" s
    JOIN "UserSkill" us ON us.skill_id = s.skill_id
    GROUP BY s.skill_id
    ORDER BY user_count DESC
    LIMIT $1
  `, [limit]);

  return r.rows;
}

// CREATE REVIEW
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
     RETURNING *`,
    [videoCallId, reviewerId, revieweeId, rating, feedbackText]
  );
  return r.rows[0];
}


// LIST REVIEWS FOR VIDEO CALL
export async function listReviews(videoCallId) {
  const r = await pool.query(
    `SELECT *
     FROM "Review"
     WHERE video_call_id = $1
     ORDER BY created_at DESC`,
    [videoCallId]
  );
  return r.rows;
}