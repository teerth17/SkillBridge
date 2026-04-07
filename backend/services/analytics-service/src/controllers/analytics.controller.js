import { ok, fail } from "../utils/response.js";
import * as A from "../models/analytics.model.js";

// GET /analytics/dashboard
export async function dashboard(req, res, next) {
  try {
    const data = await A.getUserDashboard(req.user.userId);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

// GET /analytics/users/:userId/stats  (UC15)
export async function userStats(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return fail(res, "Invalid userId", 400);

    const data = await A.getUserStats(userId);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

// GET /analytics/mentors/:mentorId/stats  (UC16)
export async function mentorStats(req, res, next) {
  try {
    const mentorId = Number(req.params.mentorId);
    if (!Number.isFinite(mentorId)) return fail(res, "Invalid mentorId", 400);

    const data = await A.getMentorStats(mentorId);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

// GET /analytics/users/:userId/badge-eligibility  (internal — called by Profile Service)
export async function badgeEligibility(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return fail(res, "Invalid userId", 400);

    const data = await A.getBadgeEligibility(userId);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

// GET /analytics/platform
export async function platformStats(req, res, next) {
  try {
    const data = await A.getPlatformStats();
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

// GET /analytics/top-mentors
export async function topMentors(req, res, next) {
  try {
    const data = await A.getTopMentors(req.query.limit || 5);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

// GET /analytics/top-skills
export async function topSkills(req, res, next) {
  try {
    const data = await A.getTopSkills(req.query.limit || 5);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}