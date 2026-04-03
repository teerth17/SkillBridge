import {pool} from "../../src/db.js";

export async function cleanDB() {
  await pool.query('TRUNCATE "User" RESTART IDENTITY CASCADE');
}