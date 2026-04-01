import {fail} from "../utils/response.js"
import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) return fail(res, "Missing or invalid token", 401);

  try {
    req.user = verifyToken(token); // { userId, email, role, iat, exp }
    return next();
  } catch {
    return fail(res, "Invalid or expired token", 401);
  }
}
