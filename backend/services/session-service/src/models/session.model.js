import { pool } from "../db.js";

export async function getSessionById(sessionId) {
  const r = await pool.query(
    `SELECT session_id, connection_id, user1_id, user2_id, skill_id, session_status, last_activity_at, created_at, updated_at
     FROM "Session"
     WHERE session_id = $1`,
    [sessionId]
  );
  return r.rows[0] || null;
}

export async function getSessionByConnection(connectionId) {
  const r = await pool.query(
    `SELECT session_id, connection_id, user1_id, user2_id, skill_id, session_status, last_activity_at, created_at, updated_at
     FROM "Session"
     WHERE connection_id = $1`,
    [connectionId]
  );
  return r.rows[0] || null;
}

export async function listSessionsForUser(userId) {
  const r = await pool.query(
    `SELECT session_id, connection_id, user1_id, user2_id, skill_id, session_status, last_activity_at, created_at, updated_at
     FROM "Session"
     WHERE user1_id = $1 OR user2_id = $1
     ORDER BY last_activity_at DESC`,
    [userId]
  );
  return r.rows;
}

export async function touchSession(sessionId) {
  await pool.query(
    `UPDATE "Session"
     SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE session_id = $1`,
    [sessionId]
  );
}

export async function createSession({ connectionId, user1Id, user2Id, skillId }) {
  const r = await pool.query(
    `INSERT INTO "Session"(connection_id, user1_id, user2_id, skill_id, session_status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING session_id, connection_id, user1_id, user2_id, skill_id, session_status, last_activity_at, created_at, updated_at`,
    [connectionId, user1Id, user2Id, skillId ?? null]
  );
  return r.rows[0];
}

export async function updateSessionStatus(sessionId, status) {
  const r = await pool.query(
    `UPDATE "Session"
     SET session_status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE session_id = $1
     RETURNING session_id, connection_id, user1_id, user2_id, skill_id, session_status, last_activity_at, created_at, updated_at`,
    [sessionId, status]
  );
  return r.rows[0] || null;
}
