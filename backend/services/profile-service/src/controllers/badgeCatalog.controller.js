import { ok } from "../utils/response.js";
import * as BadgeCatalog from "../models/badgeCatalog.model.js";

export async function getAllBadges(req, res, next) {
  try {
    const badges = await BadgeCatalog.listAllBadges();
    return ok(res, { badges });
  } catch (err) {
    return next(err);
  }
}
