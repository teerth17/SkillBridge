import { pool } from "../db.js";

export async function createVideoCall({
  sessionId,
  mentorUserId,
  topic,
  meetingUrl,
  jitsiRoomId,
  status = "pending",
}) {
  const r = await pool.query(
    `INSERT INTO "VideoCall"(session_id, mentor_user_id, topic, meeting_url, jitsi_room_id, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING video_call_id, session_id, mentor_user_id, topic, meeting_url, jitsi_room_id,
               start_time, end_time, duration_minutes, status, created_at`,
    [sessionId, mentorUserId, topic ?? null, meetingUrl ?? null, jitsiRoomId ?? null, status]
  );
  return r.rows[0];
}

export async function getVideoCallById(videoCallId) {
  const r = await pool.query(
    `SELECT video_call_id, session_id, mentor_user_id, topic, meeting_url, jitsi_room_id,
            start_time, end_time, duration_minutes, status, created_at
     FROM "VideoCall"
     WHERE video_call_id = $1`,
    [videoCallId]
  );
  return r.rows[0] || null;
}

export async function listVideoCallsForSession(sessionId) {
  const r = await pool.query(
    `SELECT video_call_id, session_id, mentor_user_id, topic, meeting_url, jitsi_room_id,
            start_time, end_time, duration_minutes, status, created_at
     FROM "VideoCall"
     WHERE session_id = $1
     ORDER BY created_at DESC`,
    [sessionId]
  );
  return r.rows;
}

export async function markStarted(videoCallId) {
  const r = await pool.query(
    `UPDATE "VideoCall"
     SET status = 'active'
     WHERE video_call_id = $1
     RETURNING video_call_id, session_id, mentor_user_id, topic, meeting_url, jitsi_room_id,
               start_time, end_time, duration_minutes, status, created_at`,
    [videoCallId]
  );
  return r.rows[0] || null;
}

export async function markEnded(videoCallId) {
  const r = await pool.query(
    `UPDATE "VideoCall"
     SET end_time = CURRENT_TIMESTAMP,
         duration_minutes = GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) / 60)),
         status = 'completed'
     WHERE video_call_id = $1
       AND end_time IS NULL
     RETURNING video_call_id, session_id, mentor_user_id, topic, meeting_url, jitsi_room_id,
               start_time, end_time, duration_minutes, status, created_at`,
    [videoCallId]
  );
  return r.rows[0] || null;
}