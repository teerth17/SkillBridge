// tests/unit/profile.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockGetUserById = jest.fn();
const mockUpdateUserProfile = jest.fn();
const mockListSkillsForUser = jest.fn();
const mockListBadgesForUser = jest.fn();

await jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  getUserById: mockGetUserById,
  updateUserProfile: mockUpdateUserProfile,
}));

await jest.unstable_mockModule("../../src/models/userSkill.model.js", () => ({
  listSkillsForUser: mockListSkillsForUser,
}));

await jest.unstable_mockModule("../../src/models/badge.model.js", () => ({
  listBadgesForUser: mockListBadgesForUser,
}));

// ---------------- IMPORT AFTER MOCK ----------------
const ProfileController = await import("../../src/controllers/profile.controller.js");

// ================================================
// getProfile
// ================================================
describe("Profile Controller - getProfile", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: { userId: "1" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns full profile for valid user", async () => {
    mockGetUserById.mockResolvedValue({
      user_id: 1,
      email: "test@example.com",
      name: "Test User",
      bio: "Hello",
      profile_picture: null,
      role: "user",
      experience: null,
      availability: null,
    });
    mockListSkillsForUser.mockResolvedValue([]);
    mockListBadgesForUser.mockResolvedValue([]);

    await ProfileController.getProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 1 }) })
    );
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "abc";
    await ProfileController.getProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ user not found returns 404", async () => {
    mockGetUserById.mockResolvedValue(null);
    await ProfileController.getProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ================================================
// updateProfile
// ================================================
describe("Profile Controller - updateProfile", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { userId: "1" },
      user: { userId: 1 },
      body: { name: "Updated Name", bio: "New bio" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ updates own profile successfully", async () => {
    mockUpdateUserProfile.mockResolvedValue({
      user_id: 1,
      name: "Updated Name",
      bio: "New bio",
    });

    await ProfileController.updateProfile(req, res, next);

    expect(mockUpdateUserProfile).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Updated Name" }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ forbidden when updating another user's profile", async () => {
    req.user = { userId: 99 }; // different user
    await ProfileController.updateProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "xyz";
    await ProfileController.updateProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid input returns 400", async () => {
    req.body = { name: "" }; // fails min(1)
    await ProfileController.updateProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ user not found returns 404", async () => {
    mockUpdateUserProfile.mockResolvedValue(null);
    await ProfileController.updateProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});