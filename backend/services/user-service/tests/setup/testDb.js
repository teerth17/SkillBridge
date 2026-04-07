import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanDB() {
  await pool.query('TRUNCATE "User" RESTART IDENTITY CASCADE');
}

export async function closeDB() {
  await pool.end();
}