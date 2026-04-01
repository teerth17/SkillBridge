import { ok } from "../utils/response.js";
import * as A from "../models/analytics.model.js";

export async function dashboard(req, res, next) {
  try {
    const data = await A.getUserDashboard(req.user.userId);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

export async function platformStats(req, res, next) {
  try {
    const data = await A.getPlatformStats();
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

export async function topMentors(req, res, next) {
  try {
    const data = await A.getTopMentors(req.query.limit || 5);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

export async function topSkills(req, res, next) {
  try {
    const data = await A.getTopSkills(req.query.limit || 5);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}