import { pool } from "../db.js";

export async function listAllBadges() {
  const r = await pool.query(
    `SELECT badge_id, badge_name, badge_type, description, icon_url, created_at
     FROM "Badge"
     ORDER BY badge_name ASC`
  );
  return r.rows;
}
