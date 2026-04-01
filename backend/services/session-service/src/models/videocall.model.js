import { pool } from "../db.js";

export async function getVideoCallById(videoCallId) {
  const r = await pool.query(
    `SELECT video_call_id, session_id, mentor_user_id, start_time, end_time, duration_minutes, status
     FROM "VideoCall"
     WHERE video_call_id = $1`,
    [videoCallId]
  );
  return r.rows[0] || null;
}

// "completed" heuristic: end_time is set OR status = 'completed'
export async function countCompletedCallsForUser(userId) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM "VideoCall" vc
     JOIN "Session" s ON s.session_id = vc.session_id
     WHERE (s.user1_id = $1 OR s.user2_id = $1)
       AND (vc.end_time IS NOT NULL OR vc.status = 'completed')`,
    [userId]
  );
  return r.rows[0]?.cnt ?? 0;
}
