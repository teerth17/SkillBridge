import { pool } from "../db.js";

export async function listBadgesForUser(userId) {
  const r = await pool.query(
    `SELECT b.badge_id,
            b.badge_name,
            b.badge_type,
            b.description,
            b.icon_url,
            ub.earned_at
     FROM "UserBadge" ub
     JOIN "Badge" b ON b.badge_id = ub.badge_id
     WHERE ub.user_id = $1
     ORDER BY ub.earned_at DESC`,
    [userId]
  );
  return r.rows;
}
