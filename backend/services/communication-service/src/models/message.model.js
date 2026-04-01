import { pool } from "../db.js";

export async function createMessage({ sessionId, senderId, messageText, messageType }) {
  const r = await pool.query(
    `INSERT INTO "Message"(session_id, sender_id, message_text, message_type)
     VALUES ($1, $2, $3, $4)
     RETURNING message_id, session_id, sender_id, message_text, message_type, is_read, sent_at`,
    [sessionId, senderId, messageText, messageType]
  );
  return r.rows[0];
}

export async function listMessages({ sessionId, limit = 50, before }) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);

  if (before) {
    const r = await pool.query(
      `SELECT message_id, session_id, sender_id, message_text, message_type, is_read, sent_at
       FROM "Message"
       WHERE session_id = $1 AND sent_at < $2
       ORDER BY sent_at DESC
       LIMIT $3`,
      [sessionId, before, lim]
    );
    return r.rows;
  }

  const r = await pool.query(
    `SELECT message_id, session_id, sender_id, message_text, message_type, is_read, sent_at
     FROM "Message"
     WHERE session_id = $1
     ORDER BY sent_at DESC
     LIMIT $2`,
    [sessionId, lim]
  );
  return r.rows;
}

export async function markAllRead({ sessionId, readerId }) {
  // Since is_read is per-message (not per-user), we interpret "read" as:
  // mark messages NOT sent by the reader as read.
  const r = await pool.query(
    `UPDATE "Message"
     SET is_read = TRUE
     WHERE session_id = $1 AND sender_id != $2 AND is_read = FALSE`,
    [sessionId, readerId]
  );
  return r.rowCount;
}
