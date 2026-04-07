// tests/unit/skillCatalog.controller.test.js
import { jest } from "@jest/globals";

const mockListAllSkills = jest.fn();

await jest.unstable_mockModule("../../src/models/skill.model.js", () => ({
  listAllSkills: mockListAllSkills,
}));

const SkillCatalogController = await import("../../src/controllers/skillCatalog.controller.js");

describe("SkillCatalog Controller - getAllSkills", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns list of all skills", async () => {
    mockListAllSkills.mockResolvedValue([
      { skill_id: 1, skill_name: "JavaScript" },
      { skill_id: 2, skill_name: "Python" },
    ]);

    await SkillCatalogController.getAllSkills(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ skills: expect.any(Array) }),
      })
    );
  });

  test("✅ returns empty array when no skills exist", async () => {
    mockListAllSkills.mockResolvedValue([]);

    await SkillCatalogController.getAllSkills(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ calls next(err) on model error", async () => {
    mockListAllSkills.mockRejectedValue(new Error("DB error"));

    await SkillCatalogController.getAllSkills(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});