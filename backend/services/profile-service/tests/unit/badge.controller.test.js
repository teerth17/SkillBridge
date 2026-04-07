// tests/unit/badge.controller.test.js
import { jest } from "@jest/globals";

const mockGetUserById = jest.fn();
const mockListBadgesForUser = jest.fn();

await jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  getUserById: mockGetUserById,
  updateUserProfile: jest.fn(),
  setRoleToMentor: jest.fn(),
}));

await jest.unstable_mockModule("../../src/models/badge.model.js", () => ({
  listBadgesForUser: mockListBadgesForUser,
}));

const BadgeController = await import("../../src/controllers/badge.controller.js");

describe("Badge Controller - getBadges", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: { userId: "1" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns badges for valid user", async () => {
    mockGetUserById.mockResolvedValue({ user_id: 1, name: "Test User" });
    mockListBadgesForUser.mockResolvedValue([
      { badge_id: 1, badge_name: "New Mentor", badge_type: "New" },
    ]);

    await BadgeController.getBadges(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ badges: expect.any(Array) }) })
    );
  });

  test("✅ returns empty badges array for user with no badges", async () => {
    mockGetUserById.mockResolvedValue({ user_id: 1, name: "Test User" });
    mockListBadgesForUser.mockResolvedValue([]);

    await BadgeController.getBadges(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "abc";
    await BadgeController.getBadges(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ user not found returns 404", async () => {
    mockGetUserById.mockResolvedValue(null);
    await BadgeController.getBadges(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});