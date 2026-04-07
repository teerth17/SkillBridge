import { pool } from "../db.js";

// ============================================================
// USER DASHBOARD (existing)
// ============================================================
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

// ============================================================
// USER STATS (UC15) — sessions attended, total hours, skills
// ============================================================
export async function getUserStats(userId) {
  const [sessions, hours, skills] = await Promise.all([
    // Sessions attended (as either participant)
    pool.query(`
      SELECT COUNT(DISTINCT s.session_id) AS sessions_attended
      FROM "Session" s
      WHERE s.user1_id = $1 OR s.user2_id = $1
    `, [userId]),

    // Total hours from completed video calls
    pool.query(`
      SELECT COALESCE(SUM(vc.duration_minutes), 0) AS total_minutes
      FROM "VideoCall" vc
      JOIN "Session" s ON vc.session_id = s.session_id
      WHERE (s.user1_id = $1 OR s.user2_id = $1)
        AND vc.status = 'completed'
    `, [userId]),

    // Skills practiced (from UserSkill profile)
    pool.query(`
      SELECT s.skill_name, us.proficiency_level
      FROM "UserSkill" us
      JOIN "Skill" s ON s.skill_id = us.skill_id
      WHERE us.user_id = $1
      ORDER BY s.skill_name ASC
    `, [userId])
  ]);

  const totalMinutes = Number(hours.rows[0].total_minutes);

  return {
    sessionsAttended: Number(sessions.rows[0].sessions_attended),
    totalHours: parseFloat((totalMinutes / 60).toFixed(1)),
    totalMinutes,
    skillsPracticed: skills.rows.map(r => r.skill_name),
    skills: skills.rows
  };
}

// ============================================================
// MENTOR STATS (UC16) — sessions hosted, mentees, rating, skill popularity
// ============================================================
export async function getMentorStats(mentorId) {
  const [hosted, mentees, rating, skillPop] = await Promise.all([
    // Sessions hosted as mentor
    pool.query(`
      SELECT COUNT(DISTINCT vc.video_call_id) AS sessions_hosted,
             COALESCE(SUM(vc.duration_minutes), 0) AS total_minutes
      FROM "VideoCall" vc
      WHERE vc.mentor_user_id = $1 AND vc.status = 'completed'
    `, [mentorId]),

    // Unique mentees (participants who are NOT the mentor)
    pool.query(`
      SELECT COUNT(DISTINCT
        CASE
          WHEN s.user1_id = $1 THEN s.user2_id
          ELSE s.user1_id
        END
      ) AS total_mentees
      FROM "VideoCall" vc
      JOIN "Session" s ON vc.session_id = s.session_id
      WHERE vc.mentor_user_id = $1 AND vc.status = 'completed'
    `, [mentorId]),

    // Average rating received as mentor
    pool.query(`
      SELECT COUNT(*) AS total_reviews,
             COALESCE(AVG(rating), 0) AS avg_rating
      FROM "Review"
      WHERE reviewee_id = $1
    `, [mentorId]),

    // Skill popularity — skills of users who attended sessions with this mentor
    pool.query(`
      SELECT sk.skill_name, COUNT(DISTINCT us.user_id) AS mentee_count
      FROM "VideoCall" vc
      JOIN "Session" s ON vc.session_id = s.session_id
      JOIN "UserSkill" us ON us.user_id = CASE
        WHEN s.user1_id = $1 THEN s.user2_id
        ELSE s.user1_id
      END
      JOIN "Skill" sk ON sk.skill_id = us.skill_id
      WHERE vc.mentor_user_id = $1 AND vc.status = 'completed'
      GROUP BY sk.skill_name
      ORDER BY mentee_count DESC
      LIMIT 10
    `, [mentorId])
  ]);

  const totalMinutes = Number(hosted.rows[0].total_minutes);

  // Build skillPopularity object: { "JavaScript": 5, "Python": 3 }
  const skillPopularity = {};
  skillPop.rows.forEach(r => {
    skillPopularity[r.skill_name] = Number(r.mentee_count);
  });

  return {
    sessionsHosted: Number(hosted.rows[0].sessions_hosted),
    totalHours: parseFloat((totalMinutes / 60).toFixed(1)),
    totalMinutes,
    totalMentees: Number(mentees.rows[0].total_mentees),
    avgRating: parseFloat(Number(rating.rows[0].avg_rating).toFixed(2)),
    totalReviews: Number(rating.rows[0].total_reviews),
    skillPopularity
  };
}

// ============================================================
// BADGE ELIGIBILITY — called by Profile Service internally
// ============================================================
export async function getBadgeEligibility(userId) {
  const [completedCalls, avgRating, badges] = await Promise.all([
    // Count completed calls as mentor
    pool.query(`
      SELECT COUNT(*) AS cnt
      FROM "VideoCall"
      WHERE mentor_user_id = $1 AND status = 'completed'
    `, [userId]),

    // Average rating received
    pool.query(`
      SELECT COALESCE(AVG(rating), 0) AS avg_rating
      FROM "Review"
      WHERE reviewee_id = $1
    `, [userId]),

    // Badge criteria from DB
    pool.query(`
      SELECT badge_id, badge_name, badge_type, criteria_sessions, criteria_rating
      FROM "Badge"
      ORDER BY criteria_sessions ASC
    `)
  ]);

  const count = Number(completedCalls.rows[0].cnt);
  const rating = parseFloat(Number(avgRating.rows[0].avg_rating).toFixed(2));

  const eligibleBadges = badges.rows
    .filter(b => {
      const meetsSessionCriteria = count >= b.criteria_sessions;
      const meetsRatingCriteria = b.criteria_rating === null
        ? true
        : rating >= parseFloat(b.criteria_rating);
      return meetsSessionCriteria && meetsRatingCriteria;
    })
    .map(b => ({
      badgeId: b.badge_id,
      badgeName: b.badge_name,
      badgeType: b.badge_type,
    }));

  return {
    userId,
    completedCalls: count,
    avgRating: rating,
    eligibleBadges
  };
}

// ============================================================
// PLATFORM STATS (existing)
// ============================================================
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

// ============================================================
// TOP MENTORS (existing)
// ============================================================
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

// ============================================================
// TOP SKILLS (existing)
// ============================================================
export async function getTopSkills(limit = 5) {
  const r = await pool.query(`
    SELECT
      s.skill_name,
      COUNT(us.user_id) AS user_count
    FROM "Skill" s
    JOIN "UserSkill" us ON us.skill_id = s.skill_id
    GROUP BY s.skill_id, s.skill_name
    ORDER BY user_count DESC
    LIMIT $1
  `, [limit]);
  return r.rows;
}

// ============================================================
// REVIEWS (existing)
// ============================================================
export async function createReview({ videoCallId, reviewerId, revieweeId, rating, feedbackText }) {
  const r = await pool.query(
    `INSERT INTO "Review"(video_call_id, reviewer_id, reviewee_id, rating, feedback_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [videoCallId, reviewerId, revieweeId, rating, feedbackText ?? null]
  );
  return r.rows[0];
}

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