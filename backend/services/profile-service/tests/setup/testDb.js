// tests/setup/testDb.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanDB() {
  // Order matters — respect foreign key constraints
  await pool.query(`TRUNCATE "UserBadge", "UserSkill", "User" RESTART IDENTITY CASCADE`);
}

// Seeds a user directly into DB, bypassing auth service
// Returns the inserted user row
export async function seedUser(overrides = {}) {
  const r = await pool.query(
    `INSERT INTO "User" (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, email, name, role`,
    [
      overrides.email ?? "test@example.com",
      overrides.password_hash ?? "hashed_password",
      overrides.name ?? "Test User",
      overrides.role ?? "user",
    ]
  );
  return r.rows[0];
}

// Returns first skill from the Skill catalog (seeded by data.sql)
export async function getFirstSkill() {
  const r = await pool.query(`SELECT skill_id, skill_name FROM "Skill" LIMIT 1`);
  return r.rows[0] || null;
}

export async function closeDB() {
  await pool.end();
}