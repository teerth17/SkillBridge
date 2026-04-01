import { pool } from "../db.js";

export async function getConnectionById(connectionId) {
  const r = await pool.query(
    `SELECT connection_id, requester_id, receiver_id, status, requested_at, responded_at, expires_at, created_at, updated_at
     FROM "Connection"
     WHERE connection_id = $1`,
    [connectionId]
  );
  return r.rows[0] || null;
}

export async function getConnectionBetweenUsers(userA, userB) {
  const r = await pool.query(
    `SELECT connection_id, requester_id, receiver_id, status, requested_at, responded_at, expires_at, created_at, updated_at
     FROM "Connection"
     WHERE (requester_id = $1 AND receiver_id = $2)
        OR (requester_id = $2 AND receiver_id = $1)
     LIMIT 1`,
    [userA, userB]
  );
  return r.rows[0] || null;
}

export async function listMyConnections(userId) {
  const r = await pool.query(
    `SELECT connection_id, requester_id, receiver_id, status, requested_at, responded_at, expires_at, created_at, updated_at
     FROM "Connection"
     WHERE requester_id = $1 OR receiver_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );
  return r.rows;
}

export async function createConnection({ requesterId, receiverId, expiresAt }) {
  const r = await pool.query(
    `INSERT INTO "Connection"(requester_id, receiver_id, status, expires_at)
     VALUES ($1, $2, 'pending', $3)
     RETURNING connection_id, requester_id, receiver_id, status, requested_at, responded_at, expires_at, created_at, updated_at`,
    [requesterId, receiverId, expiresAt]
  );
  return r.rows[0];
}

export async function updateConnectionStatus({ connectionId, status, actedAt }) {
  const r = await pool.query(
    `UPDATE "Connection"
     SET status = $2,
         responded_at = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE connection_id = $1
     RETURNING connection_id, requester_id, receiver_id, status, requested_at, responded_at, expires_at, created_at, updated_at`,
    [connectionId, status, actedAt]
  );
  return r.rows[0] || null;
}
