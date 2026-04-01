const SESSION_URL = process.env.SESSION_SERVICE_URL || "http://session-service:4002";

export async function validateUserInSession({ token, sessionId }) {
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

export async function notifyCallCompleted(videoCallId, promoteUserId) {
  const r = await fetch(`${SESSION_URL}/internal/video-calls/${videoCallId}/completed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": process.env.INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify(promoteUserId ? { promoteUserId } : {}),
  });

  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, body };
}