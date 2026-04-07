// tests/setup/testDb.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanDB() {
  await pool.query(`
    TRUNCATE "Message", "Session", "Connection", "User"
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

export async function seedMessage(sessionId, senderId, text = "Hello") {
  const r = await pool.query(
    `INSERT INTO "Message" (session_id, sender_id, message_text, message_type)
     VALUES ($1, $2, $3, 'text')
     RETURNING message_id, session_id, sender_id, message_text, is_read, sent_at`,
    [sessionId, senderId, text]
  );
  return r.rows[0];
}

export async function closeDB() {
  await pool.end();
}