import { fail } from "../utils/response.js";

export function errorHandler(err, req, res, next) {
  console.error(err);
  return fail(res, "Server error", 500);
}