// tests/unit/search.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockSearchMentors = jest.fn();
const mockSearchUsersFallback = jest.fn();
const mockAutocompleteSkills = jest.fn();

await jest.unstable_mockModule("../../src/models/search.model.js", () => ({
  searchMentors: mockSearchMentors,
  searchUsersFallback: mockSearchUsersFallback,
}));

await jest.unstable_mockModule("../../src/models/skill.model.js", () => ({
  autocompleteSkills: mockAutocompleteSkills,
}));

const SearchController = await import("../../src/controllers/search.controller.js");

// ================================================
// searchMentors
// ================================================
describe("Search Controller - searchMentors", () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns mentor results for empty query", async () => {
    mockSearchMentors.mockResolvedValue([
      { user_id: 1, name: "Alice", role: "mentor", avg_rating: "4.50", skills: [] },
    ]);

    await SearchController.searchMentors(req, res, next);

    expect(mockSearchMentors).toHaveBeenCalledWith(
      expect.objectContaining({ q: "", sortBy: "relevance", limit: "20" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fallbackUsed: false,
          count: 1,
          results: expect.any(Array),
        }),
      })
    );
  });

  test("✅ returns mentor results filtered by skill query", async () => {
    req.query = { q: "JavaScript", sortBy: "rating" };
    mockSearchMentors.mockResolvedValue([
      { user_id: 1, name: "Alice", role: "mentor", avg_rating: "4.80", skills: [] },
    ]);

    await SearchController.searchMentors(req, res, next);

    expect(mockSearchMentors).toHaveBeenCalledWith(
      expect.objectContaining({ q: "JavaScript", sortBy: "rating" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ falls back to users when no mentors found", async () => {
    mockSearchMentors.mockResolvedValue([]); // no mentors
    mockSearchUsersFallback.mockResolvedValue([
      { user_id: 2, name: "Bob", role: "user", avg_rating: "0.00", skills: [] },
    ]);

    await SearchController.searchMentors(req, res, next);

    expect(mockSearchUsersFallback).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fallbackUsed: true,
          count: 1,
        }),
      })
    );
  });

  test("✅ returns empty results when no mentors and no users found", async () => {
    mockSearchMentors.mockResolvedValue([]);
    mockSearchUsersFallback.mockResolvedValue([]);

    await SearchController.searchMentors(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fallbackUsed: true, count: 0 }),
      })
    );
  });

  test("✅ passes all filter params to model", async () => {
    req.query = {
      q: "Python",
      availability: "weekends",
      minRating: "4",
      sortBy: "experience",
      limit: "10",
    };
    mockSearchMentors.mockResolvedValue([]);
    mockSearchUsersFallback.mockResolvedValue([]);

    await SearchController.searchMentors(req, res, next);

    expect(mockSearchMentors).toHaveBeenCalledWith({
      q: "Python",
      availability: "weekends",
      minRating: "4",
      sortBy: "experience",
      limit: "10",
    });
  });

  test("❌ invalid sortBy value returns 400", async () => {
    req.query = { sortBy: "invalid_sort" };
    await SearchController.searchMentors(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ calls next(err) on model error", async () => {
    mockSearchMentors.mockRejectedValue(new Error("DB error"));
    await SearchController.searchMentors(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// autocompleteSkills
// ================================================
describe("Search Controller - autocompleteSkills", () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: { q: "java" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns matching skill suggestions", async () => {
    mockAutocompleteSkills.mockResolvedValue([
      { skill_id: 1, skill_name: "JavaScript", skill_category: "Programming" },
      { skill_id: 2, skill_name: "Java", skill_category: "Programming" },
    ]);

    await SearchController.autocompleteSkills(req, res, next);

    expect(mockAutocompleteSkills).toHaveBeenCalledWith("java", "10");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ skills: expect.any(Array) }),
      })
    );
  });

  test("✅ respects custom limit", async () => {
    req.query = { q: "py", limit: "5" };
    mockAutocompleteSkills.mockResolvedValue([
      { skill_id: 3, skill_name: "Python", skill_category: "Programming" },
    ]);

    await SearchController.autocompleteSkills(req, res, next);

    expect(mockAutocompleteSkills).toHaveBeenCalledWith("py", "5");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ returns empty array when no skills match", async () => {
    mockAutocompleteSkills.mockResolvedValue([]);

    await SearchController.autocompleteSkills(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ missing q param returns 400", async () => {
    req.query = {}; // no q
    await SearchController.autocompleteSkills(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ empty q string returns 400", async () => {
    req.query = { q: "" }; // fails min(1)
    await SearchController.autocompleteSkills(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ calls next(err) on model error", async () => {
    mockAutocompleteSkills.mockRejectedValue(new Error("DB error"));
    await SearchController.autocompleteSkills(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});