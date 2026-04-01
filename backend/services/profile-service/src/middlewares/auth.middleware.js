import jwtPkg from "jsonwebtoken";
const { verify } = jwtPkg;
import { fail } from "../utils/response.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return fail(res, "Missing or invalid token", 401);

  try {
    const decoded = verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, role, iat, exp }
    return next();
  } catch {
    return fail(res, "Invalid or expired token", 401);
  }
}
