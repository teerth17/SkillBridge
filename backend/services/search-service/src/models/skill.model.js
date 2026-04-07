import { pool } from "../db.js";

export async function autocompleteSkills(q, limit = 10) {
  const lim = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const r = await pool.query(
    `SELECT skill_id, skill_name, category
     FROM "Skill"
     WHERE skill_name ILIKE $1
     ORDER BY skill_name ASC
     LIMIT $2`,
    [`%${q}%`, lim]
  );

  return r.rows;
}