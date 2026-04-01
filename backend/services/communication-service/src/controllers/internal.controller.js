import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as Message from "../models/message.model.js";

const acceptedSchema = z.object({
  actorUserId: z.number().int().positive()
});

const videoCreatedSchema = z.object({
  actorUserId: z.number().int().positive(),
  videoCallId: z.number().int().positive(),
  meetingUrl: z.string().min(1).max(500).optional()
});

const reviewSchema = z.object({
  actorUserId: z.number().int().positive().optional(),
  videoCallId: z.number().int().positive().optional()
});

export async function connectionAccepted(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const parsed = acceptedSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const io = req.app.get("io");
    if (!io) return fail(res, "Socket server not ready", 500);

    // Create system message (FK-safe: sender is actorUserId)
    const msg = await Message.createMessage({
      sessionId,
      senderId: parsed.data.actorUserId,
      messageText: "Connection accepted. You can start chatting now.",
      messageType: "system",
    });

    io.to(`session:${sessionId}`).emit("connection_accepted", {
      sessionId,
      actorUserId: parsed.data.actorUserId,
      sentAt: msg.sent_at,
    });

    // Also emit the system message to chat stream
    io.to(`session:${sessionId}`).emit("message_received", {
      messageId: msg.message_id,
      sessionId: msg.session_id,
      senderId: msg.sender_id,
      messageText: msg.message_text,
      messageType: msg.message_type,
      isRead: msg.is_read,
      sentAt: msg.sent_at,
    });

    return ok(res, { message: "Connection accepted event broadcasted" });
  } catch (e) {
    return next(e);
  }
}

export async function videoCallCreated(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const parsed = videoCreatedSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const io = req.app.get("io");
    if (!io) return fail(res, "Socket server not ready", 500);

    const text = parsed.data.meetingUrl
      ? `Video call started. Join: ${parsed.data.meetingUrl}`
      : "Video call started.";

    const msg = await Message.createMessage({
      sessionId,
      senderId: parsed.data.actorUserId,
      messageText: text,
      messageType: "system",
    });

    io.to(`session:${sessionId}`).emit("video_call_initiated", {
      sessionId,
      videoCallId: parsed.data.videoCallId,
      meetingUrl: parsed.data.meetingUrl,
      actorUserId: parsed.data.actorUserId,
      sentAt: msg.sent_at,
    });

    io.to(`session:${sessionId}`).emit("message_received", {
      messageId: msg.message_id,
      sessionId: msg.session_id,
      senderId: msg.sender_id,
      messageText: msg.message_text,
      messageType: msg.message_type,
      isRead: msg.is_read,
      sentAt: msg.sent_at,
    });

    return ok(res, { message: "Video call created event broadcasted" });
  } catch (e) {
    return next(e);
  }
}

export async function requestReview(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const parsed = reviewSchema.safeParse(req.body || {});
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const io = req.app.get("io");
    if (!io) return fail(res, "Socket server not ready", 500);

    io.to(`session:${sessionId}`).emit("review_requested", {
      sessionId,
      videoCallId: parsed.data.videoCallId,
      requestedAt: new Date().toISOString(),
      actorUserId: parsed.data.actorUserId,
    });

    return ok(res, { message: "Review request sent" });
  } catch (e) {
    return next(e);
  }
}
