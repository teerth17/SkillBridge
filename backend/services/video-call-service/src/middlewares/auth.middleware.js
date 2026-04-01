import { fail } from "../utils/response.js";

const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://user-service:4000";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) return fail(res, "Missing or invalid token", 401);

  try {
    const r = await fetch(`${AUTH_URL}/auth/validate-token`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) return fail(res, body?.error?.message || "Unauthorized", 401);

    const d = body?.data;
    if (!d?.valid) return fail(res, "Unauthorized", 401);

    req.user = { userId: d.userId, email: d.email, role: d.role };
    req.token = token;
    return next();
  } catch (e) {
    console.error("Auth service error:", e);
    return fail(res, "Auth service unavailable", 503);
  }
}