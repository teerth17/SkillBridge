import { pool } from "../db.js";

export async function getUserRole(userId) {
  const r = await pool.query(
    `SELECT user_id, role, name
     FROM "User"
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  return r.rows[0] || null;
}