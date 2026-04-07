// tests/setup/testDb.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanDB() {
  await pool.query(`
    TRUNCATE "Review", "VideoCall", "UserBadge", "UserSkill",
             "Session", "Connection", "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function seedUser(overrides = {}) {
  const r = await pool.query(
    `INSERT INTO "User" (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, email, name, role`,
    [
      overrides.email ?? "user@example.com",
      overrides.password_hash ?? "hashed",
      overrides.name ?? "Test User",
      overrides.role ?? "user",
    ]
  );
  return r.rows[0];
}

export async function seedConnection(requesterId, receiverId, status = "accepted") {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const r = await pool.query(
    `INSERT INTO "Connection" (requester_id, receiver_id, status, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING connection_id, requester_id, receiver_id, status`,
    [requesterId, receiverId, status, expiresAt]
  );
  return r.rows[0];
}

export async function seedSession(connectionId, user1Id, user2Id) {
  const r = await pool.query(
    `INSERT INTO "Session" (connection_id, user1_id, user2_id, session_status)
     VALUES ($1, $2, $3, 'active')
     RETURNING session_id, connection_id, user1_id, user2_id`,
    [connectionId, user1Id, user2Id]
  );
  return r.rows[0];
}

export async function seedCompletedVideoCall(sessionId, mentorUserId) {
  const r = await pool.query(
    `INSERT INTO "VideoCall" (session_id, mentor_user_id, status, meeting_url, jitsi_room_id,
                              start_time, end_time, duration_minutes)
     VALUES ($1, $2, 'completed', 'http://jitsi/room', 'room-1',
             NOW() - INTERVAL '1 hour', NOW(), 60)
     RETURNING video_call_id, session_id, mentor_user_id, status, end_time`,
    [sessionId, mentorUserId]
  );
  return r.rows[0];
}

export async function seedReview(videoCallId, reviewerId, revieweeId, rating = 5) {
  const r = await pool.query(
    `INSERT INTO "Review" (video_call_id, reviewer_id, reviewee_id, rating)
     VALUES ($1, $2, $3, $4)
     RETURNING review_id, video_call_id, reviewer_id, reviewee_id, rating`,
    [videoCallId, reviewerId, revieweeId, rating]
  );
  return r.rows[0];
}

export async function seedUserSkill(userId, skillName = "JavaScript") {
  const skillRow = await pool.query(
    `SELECT skill_id FROM "Skill" WHERE skill_name ILIKE $1 LIMIT 1`,
    [skillName]
  );
  if (!skillRow.rows[0]) return null;
  const r = await pool.query(
    `INSERT INTO "UserSkill" (user_id, skill_id, proficiency_level)
     VALUES ($1, $2, 'Intermediate')
     ON CONFLICT (user_id, skill_id) DO NOTHING
     RETURNING user_id, skill_id`,
    [userId, skillRow.rows[0].skill_id]
  );
  return r.rows[0];
}

export async function closeDB() {
  await pool.end();
}