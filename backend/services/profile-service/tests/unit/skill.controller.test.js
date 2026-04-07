// tests/unit/skill.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockAddSkillToUser = jest.fn();
const mockRemoveSkillFromUser = jest.fn();

await jest.unstable_mockModule("../../src/models/userSkill.model.js", () => ({
  addSkillToUser: mockAddSkillToUser,
  removeSkillFromUser: mockRemoveSkillFromUser,
}));

// ---------------- IMPORT AFTER MOCK ----------------
const SkillController = await import("../../src/controllers/skill.controller.js");

// ================================================
// addSkill
// ================================================
describe("Skill Controller - addSkill", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { userId: "1" },
      user: { userId: 1 },
      body: { skillId: 5, proficiencyLevel: "Intermediate", yearsExperience: 2 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ adds skill successfully", async () => {
    mockAddSkillToUser.mockResolvedValue({
      user_id: 1,
      skill_id: 5,
      proficiency_level: "Intermediate",
      years_experience: 2,
    });

    await SkillController.addSkill(req, res, next);

    expect(mockAddSkillToUser).toHaveBeenCalledWith({
      userId: 1,
      skillId: 5,
      proficiencyLevel: "Intermediate",
      yearsExperience: 2,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ adds skill with only required field (skillId)", async () => {
    req.body = { skillId: 3 };
    mockAddSkillToUser.mockResolvedValue({ user_id: 1, skill_id: 3 });

    await SkillController.addSkill(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("❌ forbidden when adding skill to another user", async () => {
    req.user = { userId: 99 };
    await SkillController.addSkill(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "abc";
    await SkillController.addSkill(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid input - missing skillId returns 400", async () => {
    req.body = { proficiencyLevel: "Beginner" }; // skillId missing
    await SkillController.addSkill(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid input - invalid proficiencyLevel returns 400", async () => {
    req.body = { skillId: 1, proficiencyLevel: "Master" }; // not in enum
    await SkillController.addSkill(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// removeSkill
// ================================================
describe("Skill Controller - removeSkill", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { userId: "1", skillId: "5" },
      user: { userId: 1 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ removes skill successfully", async () => {
    mockRemoveSkillFromUser.mockResolvedValue(true);

    await SkillController.removeSkill(req, res, next);

    expect(mockRemoveSkillFromUser).toHaveBeenCalledWith(1, 5);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ forbidden when removing skill from another user", async () => {
    req.user = { userId: 99 };
    await SkillController.removeSkill(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ invalid userId returns 400", async () => {
    req.params.userId = "abc";
    await SkillController.removeSkill(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ skill not found for user returns 404", async () => {
    mockRemoveSkillFromUser.mockResolvedValue(false);
    await SkillController.removeSkill(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});