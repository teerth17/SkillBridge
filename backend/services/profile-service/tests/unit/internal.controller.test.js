// tests/unit/internal.controller.test.js
import { jest } from "@jest/globals";

const mockSetRoleToMentor = jest.fn();

await jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  getUserById: jest.fn(),
  updateUserProfile: jest.fn(),
  setRoleToMentor: mockSetRoleToMentor,
}));

const InternalController = await import("../../src/controllers/internal.controller.js");

describe("Internal Controller - promoteToMentor", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: { userId: "1" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ promotes user to mentor successfully", async () => {
    mockSetRoleToMentor.mockResolvedValue({
      user_id: 1,
      email: "test@example.com",
      name: "Test User",
      role: "mentor",
    });

    await InternalController.promoteToMentor(req, res, next);

    expect(mockSetRoleToMentor).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "mentor" }),
      })
    );
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "abc";
    await InternalController.promoteToMentor(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ user not found returns 404", async () => {
    mockSetRoleToMentor.mockResolvedValue(null);
    await InternalController.promoteToMentor(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ calls next(err) on unexpected error", async () => {
    mockSetRoleToMentor.mockRejectedValue(new Error("DB error"));
    await InternalController.promoteToMentor(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});