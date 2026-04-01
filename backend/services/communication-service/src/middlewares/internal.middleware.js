import { fail } from "../utils/response.js";

export function requireInternal(req, res, next) {
  const token = req.headers["x-internal-token"];
  if (!token) return fail(res, "Missing internal token", 401);
  if (token !== process.env.INTERNAL_SERVICE_TOKEN) return fail(res, "Invalid internal token", 403);
  return next();
}
