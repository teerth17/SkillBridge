import { pool } from "../db.js";

export async function listSkillsForUser(userId) {
  const r = await pool.query(
    `SELECT us.user_id,
            us.skill_id,
            s.skill_name AS skill_name,
            us.proficiency_level,
            us.years_experience,
            us.created_at
     FROM "UserSkill" us
     JOIN "Skill" s ON s.skill_id = us.skill_id
     WHERE us.user_id = $1
     ORDER BY s.skill_name ASC`,
    [userId]
  );
  return r.rows;
}

export async function addSkillToUser({ userId, skillId, proficiencyLevel, yearsExperience }) {
  const r = await pool.query(
    `INSERT INTO "UserSkill" (user_id, skill_id, proficiency_level, years_experience)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, skill_id) DO UPDATE
       SET proficiency_level = EXCLUDED.proficiency_level,
           years_experience = EXCLUDED.years_experience
     RETURNING user_id, skill_id, proficiency_level, years_experience, created_at`,
    [userId, skillId, proficiencyLevel ?? null, yearsExperience ?? null]
  );
  return r.rows[0];
}

export async function removeSkillFromUser(userId, skillId) {
  const r = await pool.query(
    `DELETE FROM "UserSkill"
     WHERE user_id = $1 AND skill_id = $2`,
    [userId, skillId]
  );
  return r.rowCount > 0;
}
