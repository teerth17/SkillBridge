// tests/setup/testDb.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanDB() {
  // Only clean user-related tables — Skill table is seeded by data.sql and should not be truncated
  await pool.query(`
    TRUNCATE "Review", "VideoCall", "UserBadge", "UserSkill", "Session", "Connection", "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function seedUser(overrides = {}) {
  const r = await pool.query(
    `INSERT INTO "User" (email, password_hash, name, role, availability, experience)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id, email, name, role, availability, experience`,
    [
      overrides.email ?? "user@example.com",
      overrides.password_hash ?? "hashed",
      overrides.name ?? "Test User",
      overrides.role ?? "user",
      overrides.availability ?? null,
      overrides.experience ?? null,
    ]
  );
  return r.rows[0];
}

// Add a skill to a user by skill_name (looks up from Skill catalog)
export async function seedUserSkill(userId, skillName, proficiencyLevel = "Intermediate") {
  const skillRow = await pool.query(
    `SELECT skill_id FROM "Skill" WHERE skill_name ILIKE $1 LIMIT 1`,
    [skillName]
  );
  if (!skillRow.rows[0]) return null;

  const skillId = skillRow.rows[0].skill_id;
  const r = await pool.query(
    `INSERT INTO "UserSkill" (user_id, skill_id, proficiency_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, skill_id) DO NOTHING
     RETURNING user_id, skill_id`,
    [userId, skillId, proficiencyLevel]
  );
  return r.rows[0];
}

// Get any skill from the catalog for use in tests
export async function getFirstSkill() {
  const r = await pool.query(`SELECT skill_id, skill_name FROM "Skill" LIMIT 1`);
  return r.rows[0] || null;
}

export async function closeDB() {
  await pool.end();
}