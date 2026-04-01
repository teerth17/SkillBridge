import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as SessionGate from "../models/session.model.js";
import * as User from "../models/user.model.js";
import * as VideoCall from "../models/videocall.model.js";

const COMM_URL = process.env.COMMUNICATION_SERVICE_URL || "http://communication-service:4004";
const JITSI_BASE_URL = process.env.JITSI_BASE_URL || "http://localhost:8000";

function makeRoomId(sessionId) {
  return `skillbridge-session-${sessionId}-${Date.now()}`;
}

async function notifyVideoCallCreated({ sessionId, videoCallId, meetingUrl, actorUserId }) {
  const r = await fetch(`${COMM_URL}/communication/internal/sessions/${sessionId}/video-call-created`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": process.env.INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({ actorUserId, videoCallId, meetingUrl }),
  });
  return r.ok;
}

async function requestReview(sessionId, videoCallId, actorUserId) {
  const r = await fetch(`${COMM_URL}/communication/internal/sessions/${sessionId}/request-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": process.env.INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({ videoCallId, actorUserId }),
  });
  return r.ok;
}

const createSchema = z.object({
  sessionId: z.number().int().positive(),
  topic: z.string().max(500).optional(),
  mentorUserId: z.number().int().positive().optional(),
});

export async function createCall(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const { sessionId, topic, mentorUserId } = parsed.data;
    const me = req.user.userId;

    const v = await SessionGate.validateUserInSession({ token: req.token, sessionId });
    if (!v.ok) return fail(res, v.error, 403);

    const s = v.session;
    const participantIds = [s.user1_id, s.user2_id];

    let resolvedMentorId = mentorUserId;

    const u1 = await User.getUserRole(s.user1_id);
    const u2 = await User.getUserRole(s.user2_id);
    if (!u1 || !u2) return fail(res, "Participant not found", 404);

    // Determine mentorUserId
    if (u1.role === "mentor" && u2.role !== "mentor") {
      resolvedMentorId = u1.user_id;
    } else if (u2.role === "mentor" && u1.role !== "mentor") {
      resolvedMentorId = u2.user_id;
    } else {
      // ambiguous: both user OR both mentor
      if (!resolvedMentorId) {
        return fail(res, "mentorUserId is required for this call", 400);
      }
      if (!participantIds.includes(resolvedMentorId)) {
        return fail(res, "mentorUserId must be a session participant", 400);
      }
    }

    const roomId = makeRoomId(sessionId);
    const meetingUrl = `${JITSI_BASE_URL}/${roomId}`;

    const created = await VideoCall.createVideoCall({
      sessionId,
      mentorUserId: resolvedMentorId,
      topic,
      meetingUrl,
      jitsiRoomId: roomId,
      status: "pending",
    });

    await notifyVideoCallCreated({
      sessionId,
      videoCallId: created.video_call_id,
      meetingUrl,
      actorUserId: me,
    });

    return ok(res, {
      videoCallId: created.video_call_id,
      sessionId: created.session_id,
      mentorUserId: created.mentor_user_id,
      meetingUrl: created.meeting_url,
      jitsiRoomId: created.jitsi_room_id,
      status: created.status,
      topic: created.topic,
      startTime: created.start_time,
    }, 201);
  } catch (e) {
    return next(e);
  }
}

export async function startCall(req, res, next) {
  try {
    const videoCallId = Number(req.params.videoCallId);
    if (!Number.isFinite(videoCallId)) return fail(res, "Invalid videoCallId", 400);

    const call = await VideoCall.getVideoCallById(videoCallId);
    if (!call) return fail(res, "Video call not found", 404);

    const v = await SessionGate.validateUserInSession({ token: req.token, sessionId: call.session_id });
    if (!v.ok) return fail(res, v.error, 403);

    const updated = await VideoCall.markStarted(videoCallId);
    return ok(res, { videoCall: updated });
  } catch (e) {
    return next(e);
  }
}

export async function endCall(req, res, next) {
  try {
    const videoCallId = Number(req.params.videoCallId);
    if (!Number.isFinite(videoCallId)) return fail(res, "Invalid videoCallId", 400);

    const call = await VideoCall.getVideoCallById(videoCallId);
    if (!call) return fail(res, "Video call not found", 404);

    const v = await SessionGate.validateUserInSession({ token: req.token, sessionId: call.session_id });
    if (!v.ok) return fail(res, v.error, 403);

    const ended = await VideoCall.markEnded(videoCallId);
    if (!ended) return fail(res, "Video call already ended or not found", 400);

    await requestReview(ended.session_id, ended.video_call_id, req.user.userId);

    // Promotion rule: if one participant is mentor and the other is user, promote the user after first completed session.
    const s = v.session;
    const u1 = await User.getUserRole(s.user1_id);
    const u2 = await User.getUserRole(s.user2_id);

    let promoteUserId;
    if (u1?.role === "mentor" && u2?.role === "user") promoteUserId = u2.user_id;
    else if (u2?.role === "mentor" && u1?.role === "user") promoteUserId = u1.user_id;

    await SessionGate.notifyCallCompleted(ended.video_call_id, promoteUserId);

    return ok(res, { videoCall: ended });
  } catch (e) {
    return next(e);
  }
}

export async function listCallsForSession(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const v = await SessionGate.validateUserInSession({ token: req.token, sessionId });
    if (!v.ok) return fail(res, v.error, 403);

    const rows = await VideoCall.listVideoCallsForSession(sessionId);
    return ok(res, { videoCalls: rows });
  } catch (e) {
    return next(e);
  }
}