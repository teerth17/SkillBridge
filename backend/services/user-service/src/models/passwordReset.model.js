import { pool } from "../db.js";

export async function createResetToken({ userId, tokenHash, expiresAt }) {
  await pool.query(
    `INSERT INTO PasswordResetToken (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

export async function findValidToken(tokenHash) {
  const r = await pool.query(
    `SELECT reset_id, user_id
     FROM PasswordResetToken
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash]
  );
  return r.rows[0] || null;
}

export async function markUsed(resetId) {
  await pool.query(
    `UPDATE PasswordResetToken
     SET used_at = CURRENT_TIMESTAMP
     WHERE reset_id = $1`,
    [resetId]
  );
}

export default { createResetToken, findValidToken, markUsed };
