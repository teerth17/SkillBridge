// tests/setup/testDb.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanDB() {
  await pool.query(`
    TRUNCATE "Review", "VideoCall", "Session", "Connection", "User"
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
     RETURNING session_id, connection_id, user1_id, user2_id, session_status`,
    [connectionId, user1Id, user2Id]
  );
  return r.rows[0];
}

export async function seedVideoCall(sessionId, mentorUserId, overrides = {}) {
  const r = await pool.query(
    `INSERT INTO "VideoCall" (session_id, mentor_user_id, status, meeting_url, jitsi_room_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING video_call_id, session_id, mentor_user_id, status, meeting_url, start_time, end_time`,
    [
      sessionId,
      mentorUserId,
      overrides.status ?? "pending",
      overrides.meeting_url ?? "http://jitsi/room-test",
      overrides.jitsi_room_id ?? "room-test",
    ]
  );
  return r.rows[0];
}

export async function seedCompletedVideoCall(sessionId, mentorUserId) {
  const r = await pool.query(
    `INSERT INTO "VideoCall" (session_id, mentor_user_id, status, meeting_url, jitsi_room_id, start_time, end_time, duration_minutes)
     VALUES ($1, $2, 'completed', 'http://jitsi/room-done', 'room-done', NOW() - INTERVAL '1 hour', NOW(), 60)
     RETURNING video_call_id, session_id, mentor_user_id, status, end_time`,
    [sessionId, mentorUserId]
  );
  return r.rows[0];
}

export async function closeDB() {
  await pool.end();
}