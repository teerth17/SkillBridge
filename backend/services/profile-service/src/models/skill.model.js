import { pool } from "../db.js";

export async function listAllSkills() {
  const r = await pool.query(
    `SELECT skill_id, skill_name, category, created_at
     FROM "Skill"
     ORDER BY skill_name ASC`
  );
  return r.rows;
}
