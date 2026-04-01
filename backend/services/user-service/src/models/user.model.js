import { pool } from "../db.js";

/**
 * Only return auth-safe user fields.
 * Profile fields exist but are not required for signup/login.
 */
export function toPublicUser(row) {
  return {
    user_id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login: row.last_login,
  };
}

export async function findByEmail(email) {
  const r = await pool.query(
    `SELECT user_id, email, password_hash, name, role, created_at, updated_at, last_login, deleted_at
     FROM "User"
     WHERE email = $1`,
    [email.toLowerCase()]
  );
  return r.rows[0] || null;
}

export async function createUser({ email, name, passwordHash, role }) {
  // role is optional; default to table default ('user') if not provided
  if (role) {
    const r = await pool.query(
      `INSERT INTO "User" (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email, name, role, created_at, updated_at, last_login`,
      [email.toLowerCase(), passwordHash, name, role]
    );
    return r.rows[0];
  }

  const r = await pool.query(
    `INSERT INTO "User" (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING user_id, email, name, role, created_at, updated_at, last_login`,
    [email.toLowerCase(), passwordHash, name]
  );
  return r.rows[0];
}

export async function updateLastLogin(userId) {
  await pool.query(
    `UPDATE "User"
     SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId]
  );
}

export async function updatePassword(userId, passwordHash) {
  await pool.query(
    `UPDATE "User"
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2`,
    [passwordHash, userId]
  );
}

export default {
  toPublicUser,
  findByEmail,
  createUser,
  updateLastLogin,
  updatePassword,
};
