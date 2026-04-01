const SESSION_URL = process.env.SESSION_SERVICE_URL || "http://session-service:4002";

export async function validateUserInSession({ token, sessionId }) {
  // Use Session Service as source of truth for participation:
  // GET /sessions/:id requires auth and returns session with participants if allowed.
  const r = await fetch(`${SESSION_URL}/sessions/${sessionId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: body?.error?.message || "Invalid session" };

  const s = body?.data?.session;
  if (!s) return { ok: false, error: "Invalid session" };

  return { ok: true, session: s };
}
