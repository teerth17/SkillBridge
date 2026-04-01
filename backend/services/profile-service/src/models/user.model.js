import { pool } from "../db.js";

export async function getUserById(userId) {
  const r = await pool.query(
    `SELECT user_id, email, name, bio, profile_picture, role, experience, availability,
            created_at, updated_at, last_login, deleted_at
     FROM "User"
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  return r.rows[0] || null;
}

export async function updateUserProfile(userId, patch) {
  // Only allow these fields to change in Profile service
  const allowed = ["name", "bio", "profile_picture", "experience", "availability"];
  const keys = Object.keys(patch).filter((k) => allowed.includes(k));

  if (keys.length === 0) return await getUserById(userId);

  // Build dynamic SQL safely
  const sets = [];
  const values = [];
  let i = 1;

  for (const k of keys) {
    sets.push(`${k} = $${i++}`);
    values.push(patch[k]);
  }

  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const sql = `
    UPDATE "User"
    SET ${sets.join(", ")}
    WHERE user_id = $${i} AND deleted_at IS NULL
    RETURNING user_id, email, name, bio, profile_picture, role, experience, availability,
              created_at, updated_at, last_login
  `;

  const r = await pool.query(sql, values);
  return r.rows[0] || null;
}

export async function setRoleToMentor(userId) {
  const r = await pool.query(
    `UPDATE "User"
     SET role = 'mentor', updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND deleted_at IS NULL
     RETURNING user_id, email, name, role`,
    [userId]
  );
  return r.rows[0] || null;
}
