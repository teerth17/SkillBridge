// tests/unit/badgeCatalog.controller.test.js
import { jest } from "@jest/globals";

const mockListAllBadges = jest.fn();

await jest.unstable_mockModule("../../src/models/badgeCatalog.model.js", () => ({
  listAllBadges: mockListAllBadges,
}));

const BadgeCatalogController = await import("../../src/controllers/badgeCatalog.controller.js");

describe("BadgeCatalog Controller - getAllBadges", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns list of all badges", async () => {
    mockListAllBadges.mockResolvedValue([
      { badge_id: 1, badge_name: "New Mentor", badge_type: "New" },
      { badge_id: 2, badge_name: "Trusted Mentor", badge_type: "Trusted" },
    ]);

    await BadgeCatalogController.getAllBadges(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ badges: expect.any(Array) }),
      })
    );
  });

  test("✅ returns empty array when no badges exist", async () => {
    mockListAllBadges.mockResolvedValue([]);

    await BadgeCatalogController.getAllBadges(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ calls next(err) on model error", async () => {
    mockListAllBadges.mockRejectedValue(new Error("DB error"));

    await BadgeCatalogController.getAllBadges(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});