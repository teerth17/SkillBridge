// tests/unit/analytics.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockGetUserDashboard = jest.fn();
const mockGetUserStats = jest.fn();
const mockGetMentorStats = jest.fn();
const mockGetBadgeEligibility = jest.fn();
const mockGetPlatformStats = jest.fn();
const mockGetTopMentors = jest.fn();
const mockGetTopSkills = jest.fn();

await jest.unstable_mockModule("../../src/models/analytics.model.js", () => ({
  getUserDashboard: mockGetUserDashboard,
  getUserStats: mockGetUserStats,
  getMentorStats: mockGetMentorStats,
  getBadgeEligibility: mockGetBadgeEligibility,
  getPlatformStats: mockGetPlatformStats,
  getTopMentors: mockGetTopMentors,
  getTopSkills: mockGetTopSkills,
  createReview: jest.fn(),
  listReviews: jest.fn(),
}));

const AnalyticsController = await import("../../src/controllers/analytics.controller.js");

// ================================================
// dashboard
// ================================================
describe("Analytics Controller - dashboard", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns dashboard data for current user", async () => {
    mockGetUserDashboard.mockResolvedValue({
      completedCalls: 5,
      totalReviews: 3,
      avgRating: 4.5,
      skills: [{ skill_name: "JavaScript" }],
    });

    await AnalyticsController.dashboard(req, res, next);

    expect(mockGetUserDashboard).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ calls next(err) on model error", async () => {
    mockGetUserDashboard.mockRejectedValue(new Error("DB error"));
    await AnalyticsController.dashboard(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// userStats
// ================================================
describe("Analytics Controller - userStats", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: { userId: "1" }, user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns stats for valid userId", async () => {
    mockGetUserStats.mockResolvedValue({
      sessionsAttended: 3,
      totalHours: 1.5,
      totalMinutes: 90,
      skillsPracticed: ["JavaScript"],
      skills: [],
    });

    await AnalyticsController.userStats(req, res, next);

    expect(mockGetUserStats).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sessionsAttended: 3, totalHours: 1.5 }),
      })
    );
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "abc";
    await AnalyticsController.userStats(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ calls next(err) on model error", async () => {
    mockGetUserStats.mockRejectedValue(new Error("DB error"));
    await AnalyticsController.userStats(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// mentorStats
// ================================================
describe("Analytics Controller - mentorStats", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: { mentorId: "1" }, user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns mentor stats for valid mentorId", async () => {
    mockGetMentorStats.mockResolvedValue({
      sessionsHosted: 10,
      totalHours: 8.5,
      totalMentees: 7,
      avgRating: 4.6,
      totalReviews: 9,
      skillPopularity: { JavaScript: 5, Python: 3 },
    });

    await AnalyticsController.mentorStats(req, res, next);

    expect(mockGetMentorStats).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sessionsHosted: 10, avgRating: 4.6 }),
      })
    );
  });

  test("❌ invalid mentorId returns 400", async () => {
    req.params.mentorId = "xyz";
    await AnalyticsController.mentorStats(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ calls next(err) on model error", async () => {
    mockGetMentorStats.mockRejectedValue(new Error("DB error"));
    await AnalyticsController.mentorStats(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// badgeEligibility
// ================================================
describe("Analytics Controller - badgeEligibility", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: { userId: "1" }, user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns badge eligibility for valid userId", async () => {
    mockGetBadgeEligibility.mockResolvedValue({
      userId: 1,
      completedCalls: 1,
      avgRating: 0,
      eligibleBadges: [{ badgeId: 1, badgeName: "New Mentor", badgeType: "New" }],
    });

    await AnalyticsController.badgeEligibility(req, res, next);

    expect(mockGetBadgeEligibility).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eligibleBadges: expect.any(Array) }),
      })
    );
  });

  test("✅ returns empty eligibleBadges when no criteria met", async () => {
    mockGetBadgeEligibility.mockResolvedValue({
      userId: 1,
      completedCalls: 0,
      avgRating: 0,
      eligibleBadges: [],
    });

    await AnalyticsController.badgeEligibility(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "abc";
    await AnalyticsController.badgeEligibility(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// platformStats
// ================================================
describe("Analytics Controller - platformStats", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns platform stats", async () => {
    mockGetPlatformStats.mockResolvedValue({
      total_users: 100,
      total_mentors: 20,
      total_calls: 50,
      completed_calls: 40,
    });

    await AnalyticsController.platformStats(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ calls next(err) on model error", async () => {
    mockGetPlatformStats.mockRejectedValue(new Error("DB error"));
    await AnalyticsController.platformStats(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// topMentors
// ================================================
describe("Analytics Controller - topMentors", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { userId: 1 }, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns top mentors with default limit", async () => {
    mockGetTopMentors.mockResolvedValue([
      { user_id: 1, name: "Alice", avg_rating: 4.9, completed_calls: 10 },
    ]);

    await AnalyticsController.topMentors(req, res, next);

    expect(mockGetTopMentors).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ respects custom limit from query param", async () => {
    req.query.limit = "3";
    mockGetTopMentors.mockResolvedValue([]);

    await AnalyticsController.topMentors(req, res, next);

    expect(mockGetTopMentors).toHaveBeenCalledWith("3");
  });
});

// ================================================
// topSkills
// ================================================
describe("Analytics Controller - topSkills", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { userId: 1 }, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns top skills", async () => {
    mockGetTopSkills.mockResolvedValue([
      { skill_name: "JavaScript", user_count: 15 },
      { skill_name: "Python", user_count: 10 },
    ]);

    await AnalyticsController.topSkills(req, res, next);

    expect(mockGetTopSkills).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});