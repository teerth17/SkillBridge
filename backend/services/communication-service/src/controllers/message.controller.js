import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as SessionGate from "../models/session.model.js";
import * as Message from "../models/message.model.js";

function getBearer(req) {
  return (req.headers.authorization || "").split(" ")[1] || "";
}

export async function getMessages(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const token = getBearer(req);
    const v = await SessionGate.validateUserInSession({ token, sessionId });
    if (!v.ok) return fail(res, v.error, 403);

    const { limit, before } = req.query;
    const rows = await Message.listMessages({
      sessionId,
      limit,
      before: before ? new Date(String(before)) : undefined,
    });

    return ok(res, { messages: rows });
  } catch (e) {
    return next(e);
  }
}

const postSchema = z.object({
  text: z.string().min(1),
  messageType: z.enum(["text", "system"]).optional(),
});

export async function postMessage(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const token = getBearer(req);
    const v = await SessionGate.validateUserInSession({ token, sessionId });
    if (!v.ok) return fail(res, v.error, 403);

    const row = await Message.createMessage({
      sessionId,
      senderId: req.user.userId,
      messageText: parsed.data.text,
      messageType: parsed.data.messageType || "text",
    });

    // Socket emit happens in socket layer; REST just returns saved row.
    return ok(res, { message: row }, 201);
  } catch (e) {
    return next(e);
  }
}

export async function markRead(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const token = getBearer(req);
    const v = await SessionGate.validateUserInSession({ token, sessionId });
    if (!v.ok) return fail(res, v.error, 403);

    const count = await Message.markAllRead({
      sessionId,
      readerId: req.user.userId,
    });

    return ok(res, { updated: count });
  } catch (e) {
    return next(e);
  }
}
