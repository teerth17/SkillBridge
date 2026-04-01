import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as Connection from "../models/connection.model.js";

const createSchema = z.object({
  receiverId: z.number().int().positive(),
  expiresAt: z.string().datetime().optional() // optional, else default = now + 7 days
});

export async function listMyConnections(req, res, next) {
  try {
    const rows = await Connection.listMyConnections(req.user.userId);
    return ok(res, { connections: rows });
  } catch (e) {
    return next(e);
  }
}

export async function createConnection(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const requesterId = req.user.userId;
    const receiverId = parsed.data.receiverId;
    if (requesterId === receiverId) return fail(res, "Cannot connect with yourself", 400);

    const existing = await Connection.getConnectionBetweenUsers(requesterId, receiverId);
    if (existing) return ok(res, { connection: existing }); // idempotent

    const expiresAt = parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const created = await Connection.createConnection({ requesterId, receiverId, expiresAt });
    return ok(res, { connection: created }, 201);
  } catch (e) {
    return next(e);
  }
}

const respondSchema = z.object({
  status: z.enum(["accepted", "rejected", "blocked"])
});

export async function respondToConnection(req, res, next) {
  try {
    const connectionId = Number(req.params.connectionId);
    if (!Number.isFinite(connectionId)) return fail(res, "Invalid connectionId", 400);

    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const conn = await Connection.getConnectionById(connectionId);
    if (!conn) return fail(res, "Connection not found", 404);

    const me = req.user.userId;
    const isParticipant = conn.requester_id === me || conn.receiver_id === me;
    if (!isParticipant) return fail(res, "Forbidden", 403);

    // Accept/reject should be performed by receiver usually, but allow both for simplicity:
    const updated = await Connection.updateConnectionStatus({
      connectionId,
      status: parsed.data.status,
      actedAt: new Date()
    });

    return ok(res, { connection: updated });
  } catch (e) {
    return next(e);
  }
}
