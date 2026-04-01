import { Pool } from "pg";


const DATABASE_URL = process.env.DATABASE_URL;
console.log("URL: " + DATABASE_URL)
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for user-service');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}
