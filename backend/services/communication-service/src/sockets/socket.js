import { Server } from "socket.io";
import * as SessionGate from "../models/session.model.js";
import * as Message from "../models/message.model.js";

const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://user-service:4000";

const VIDEO_URL = process.env.VIDEO_CALL_SERVICE_URL || "http://video-call-service:4006";

async function createVideoCall({ token, sessionId, topic }) {
  const r = await fetch(`${VIDEO_URL}/video-calls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, topic }),
  });

  const body = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: body?.error?.message || "Video call service error" };

  return { ok: true, data: body?.data };
}


async function validateToken(token) {
  const r = await fetch(`${AUTH_URL}/auth/validate-token`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body?.data?.valid) return null;
  return { userId: body.data.userId, email: body.data.email, role: body.data.role, token };
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // handshake auth
  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || "").split(" ")[1];

    if (!token) return next(new Error("Missing token"));

    const user = await validateToken(token);
    if (!user) return next(new Error("Unauthorized"));

    socket.data.user = user; // includes token for session validation calls
    next();
  });

  io.on("connection", (socket) => {
    const me = socket.data.user;

    socket.on("join_session", async ({ sessionId }) => {
      const sid = Number(sessionId);
      if (!Number.isFinite(sid)) return;

      // Validate session membership via Session Service
      const v = await SessionGate.validateUserInSession({ token: me.token, sessionId: sid });
      if (!v.ok) {
        socket.emit("error", { message: "Forbidden session" });
        return;
      }

      socket.join(`session:${sid}`);
      io.to(`session:${sid}`).emit("participant_joined", { sessionId: sid, userId: me.userId });
    });

    socket.on("leave_session", async ({ sessionId }) => {
      const sid = Number(sessionId);
      if (!Number.isFinite(sid)) return;

      socket.leave(`session:${sid}`);
      io.to(`session:${sid}`).emit("participant_left", { sessionId: sid, userId: me.userId });
    });

    socket.on("typing", async ({ sessionId, isTyping }) => {
      const sid = Number(sessionId);
      if (!Number.isFinite(sid)) return;

      // optional: trust join state; or validate again (costly). We'll trust membership.
      socket.to(`session:${sid}`).emit("user_typing", {
        sessionId: sid,
        userId: me.userId,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on("send_message", async ({ sessionId, text, messageType }) => {
      const sid = Number(sessionId);
      if (!Number.isFinite(sid)) return;
      const msgText = String(text ?? "").trim();
      if (!msgText) return;

      // Validate membership
      const v = await SessionGate.validateUserInSession({ token: me.token, sessionId: sid });
      if (!v.ok) {
        socket.emit("error", { message: "Forbidden session" });
        return;
      }

      const type = messageType === "system" ? "system" : "text";

      const saved = await Message.createMessage({
        sessionId: sid,
        senderId: me.userId,
        messageText: msgText,
        messageType: type,
      });

      io.to(`session:${sid}`).emit("message_received", {
        messageId: saved.message_id,
        sessionId: saved.session_id,
        senderId: saved.sender_id,
        messageText: saved.message_text,
        messageType: saved.message_type,
        isRead: saved.is_read,
        sentAt: saved.sent_at,
      });
    });

    socket.on("mark_read", async ({ sessionId }) => {
      const sid = Number(sessionId);
      if (!Number.isFinite(sid)) return;

      const v = await SessionGate.validateUserInSession({ token: me.token, sessionId: sid });
      if (!v.ok) return;

      await Message.markAllRead({ sessionId: sid, readerId: me.userId });

      io.to(`session:${sid}`).emit("messages_read", {
        sessionId: sid,
        readerId: me.userId,
      });
    });

    socket.on("initiate_video_call", async ({ sessionId, topic }) => {
  const sid = Number(sessionId);
  if (!Number.isFinite(sid)) return;

  // Validate membership
  const v = await SessionGate.validateUserInSession({ token: me.token, sessionId: sid });
  if (!v.ok) {
    socket.emit("error", { message: "Forbidden session" });
    return;
  }

  // Try video-call service (it may not be running yet)
  try {
    const created = await createVideoCall({ token: me.token, sessionId: sid, topic });

    if (!created.ok) {
      socket.emit("error", { message: created.error });
      return;
    }

    // Expect video-call service returns { videoCallId, meetingUrl }
    const { videoCallId, meetingUrl } = created.data;

    io.to(`session:${sid}`).emit("video_call_initiated", {
      sessionId: sid,
      videoCallId,
      meetingUrl,
      actorUserId: me.userId,
      sentAt: new Date().toISOString()
    });
  } catch (e) {
    socket.emit("error", { message: "Video call service unavailable" });
  }
});

    socket.on("disconnect", () => {
      // If needed, you can track online/offline globally here.
    });
  });

  return io;
}
