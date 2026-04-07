// tests/setup/testDb.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanDB() {
  // Order matters — respect foreign key constraints
  await pool.query(`
    TRUNCATE "VideoCall", "Session", "Connection", "User"
    RESTART IDENTITY CASCADE
  `);
}

// Seeds a bare user directly into DB (bypasses auth service)
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

// Seeds a pending connection between two users
export async function seedConnection(requesterId, receiverId, status = "pending") {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const r = await pool.query(
    `INSERT INTO "Connection" (requester_id, receiver_id, status, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING connection_id, requester_id, receiver_id, status`,
    [requesterId, receiverId, status, expiresAt]
  );
  return r.rows[0];
}

// Seeds a session for an accepted connection
export async function seedSession(connectionId, user1Id, user2Id) {
  const r = await pool.query(
    `INSERT INTO "Session" (connection_id, user1_id, user2_id, session_status)
     VALUES ($1, $2, $3, 'active')
     RETURNING session_id, connection_id, user1_id, user2_id, session_status`,
    [connectionId, user1Id, user2Id]
  );
  return r.rows[0];
}

// Seeds a completed video call for a session
export async function seedCompletedVideoCall(sessionId, mentorUserId) {
  const r = await pool.query(
    `INSERT INTO "VideoCall" (session_id, mentor_user_id, status, start_time, end_time, duration_minutes, meeting_url, jitsi_room_id)
     VALUES ($1, $2, 'completed', NOW() - INTERVAL '1 hour', NOW(), 60, 'http://jitsi/room', 'room-1')
     RETURNING video_call_id, session_id, status`,
    [sessionId, mentorUserId]
  );
  return r.rows[0];
}

export async function closeDB() {
  await pool.end();
}