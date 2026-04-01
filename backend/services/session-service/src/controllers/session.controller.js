import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as Connection from "../models/connection.model.js";
import * as Session from "../models/session.model.js";

export async function listMySessions(req, res, next) {
  try {
    const rows = await Session.listSessionsForUser(req.user.userId);
    return ok(res, { sessions: rows });
  } catch (e) {
    return next(e);
  }
}

export async function getSession(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const s = await Session.getSessionById(sessionId);
    if (!s) return fail(res, "Session not found", 404);

    const me = req.user.userId;
    if (s.user1_id !== me && s.user2_id !== me) return fail(res, "Forbidden", 403);

    return ok(res, { session: s });
  } catch (e) {
    return next(e);
  }
}

const createSchema = z.object({
  connectionId: z.number().int().positive(),
  skillId: z.number().int().positive().optional()
});

export async function createOrGetSession(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const me = req.user.userId;
    const conn = await Connection.getConnectionById(parsed.data.connectionId);
    if (!conn) return fail(res, "Connection not found", 404);

    // must be participant
    if (conn.requester_id !== me && conn.receiver_id !== me) return fail(res, "Forbidden", 403);

    // must be accepted
    if (conn.status !== "accepted") return fail(res, "Connection is not accepted", 400);

    // idempotent: one session per connection
    const existing = await Session.getSessionByConnection(conn.connection_id);
    if (existing) return ok(res, { session: existing });

    // user1/user2 must match participants; trigger in DB also checks participants
    const created = await Session.createSession({
      connectionId: conn.connection_id,
      user1Id: conn.requester_id,
      user2Id: conn.receiver_id,
      skillId: parsed.data.skillId
    });

    return ok(res, { session: created }, 201);
  } catch (e) {
    // If unique constraint hit due to race, return existing
    if (e?.code === "23505") {
      const connectionId = req.body?.connectionId;
      if (connectionId) {
        const existing = await Session.getSessionByConnection(connectionId);
        if (existing) return ok(res, { session: existing });
      }
    }
    return next(e);
  }
}

const statusSchema = z.object({
  sessionStatus: z.enum(["active", "archived", "closed"])
});

export async function updateSessionStatus(req, res, next) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) return fail(res, "Invalid sessionId", 400);

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const s = await Session.getSessionById(sessionId);
    if (!s) return fail(res, "Session not found", 404);

    const me = req.user.userId;
    if (s.user1_id !== me && s.user2_id !== me) return fail(res, "Forbidden", 403);

    const updated = await Session.updateSessionStatus(sessionId, parsed.data.sessionStatus);
    return ok(res, { session: updated });
  } catch (e) {
    return next(e);
  }
}
