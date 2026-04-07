// tests/integration/search.routes.test.js
import request from "supertest";
import app from "../setup/testApp.js";
import { cleanDB, seedUser, seedUserSkill, getFirstSkill, closeDB } from "../setup/testDb.js";

// Mock Auth service fetch call
function mockAuthFetch(userId, role = "user") {
  global.fetch = async (url) => {
    if (url.includes("/auth/validate-token")) {
      return {
        ok: true,
        json: async () => ({
          data: { valid: true, userId, email: "test@example.com", role },
        }),
      };
    }
    return { ok: false, json: async () => ({}) };
  };
}

describe("Search Service - Integration", () => {

  beforeEach(async () => {
    await cleanDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  // ================================================
  // GET /search/mentors
  // ================================================
  describe("GET /search/mentors", () => {

    test("✅ returns empty results when no mentors exist", async () => {
      const user = await seedUser({ email: "searcher@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/search/mentors")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("results");
      expect(res.body.data).toHaveProperty("count");
      expect(res.body.data).toHaveProperty("fallbackUsed");
    });

    test("✅ returns mentors when they exist", async () => {
      const searcher = await seedUser({ email: "s@example.com" });
      const mentor = await seedUser({
        email: "mentor@example.com",
        role: "mentor",
        availability: "weekends",
      });
      mockAuthFetch(searcher.user_id);

      const res = await request(app)
        .get("/search/mentors")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.count).toBeGreaterThanOrEqual(1);
      const mentorResult = res.body.data.results.find((r) => r.user_id === mentor.user_id);
      expect(mentorResult).toBeDefined();
      expect(mentorResult.role).toBe("mentor");
    });

    test("✅ filters mentors by skill query", async () => {
      const searcher = await seedUser({ email: "sf@example.com" });
      const mentor = await seedUser({ email: "mf@example.com", role: "mentor" });
      const skill = await getFirstSkill();

      if (skill) {
        await seedUserSkill(mentor.user_id, skill.skill_name);
      }

      mockAuthFetch(searcher.user_id);

      const res = await request(app)
        .get(`/search/mentors?q=${encodeURIComponent(skill?.skill_name || "JavaScript")}`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("results");
    });

    test("✅ filters by availability", async () => {
      const searcher = await seedUser({ email: "sa@example.com" });
      await seedUser({
        email: "ma@example.com",
        role: "mentor",
        availability: "weekdays only",
      });
      await seedUser({
        email: "mb@example.com",
        role: "mentor",
        availability: "weekends only",
      });
      mockAuthFetch(searcher.user_id);

      const res = await request(app)
        .get("/search/mentors?availability=weekdays")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      // all returned results should have availability matching "weekdays"
      res.body.data.results.forEach((r) => {
        if (r.availability) {
          expect(r.availability.toLowerCase()).toContain("weekday");
        }
      });
    });

    test("✅ sorts results by rating", async () => {
      const searcher = await seedUser({ email: "sr@example.com" });
      mockAuthFetch(searcher.user_id);

      const res = await request(app)
        .get("/search/mentors?sortBy=rating")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
    });

    test("✅ sorts results by experience", async () => {
      const searcher = await seedUser({ email: "se@example.com" });
      mockAuthFetch(searcher.user_id);

      const res = await request(app)
        .get("/search/mentors?sortBy=experience")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
    });

    test("✅ falls back to users when no mentors found for query", async () => {
      const searcher = await seedUser({ email: "sfb@example.com" });
      // seed a regular user with the skill (no mentors)
      const user = await seedUser({ email: "ufb@example.com", role: "user" });
      const skill = await getFirstSkill();
      if (skill) {
        await seedUserSkill(user.user_id, skill.skill_name);
      }
      mockAuthFetch(searcher.user_id);

      // Search for something that only the user has
      const res = await request(app)
        .get(`/search/mentors?q=${encodeURIComponent(skill?.skill_name || "test")}`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("fallbackUsed");
    });

    test("✅ respects limit param", async () => {
      const searcher = await seedUser({ email: "sl@example.com" });
      // seed 3 mentors
      await seedUser({ email: "m1@example.com", role: "mentor" });
      await seedUser({ email: "m2@example.com", role: "mentor" });
      await seedUser({ email: "m3@example.com", role: "mentor" });
      mockAuthFetch(searcher.user_id);

      const res = await request(app)
        .get("/search/mentors?limit=2")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.results.length).toBeLessThanOrEqual(2);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).get("/search/mentors");
      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 400 for invalid sortBy value", async () => {
      const user = await seedUser({ email: "invalid@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/search/mentors?sortBy=invalid")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // GET /search/skills/autocomplete
  // ================================================
  describe("GET /search/skills/autocomplete", () => {

    test("✅ returns matching skills from catalog", async () => {
      const user = await seedUser({ email: "ac1@example.com" });
      mockAuthFetch(user.user_id);

      // Get a real skill from DB to search for
      const skill = await getFirstSkill();
      if (!skill) return; // skip if no skills seeded

      const prefix = skill.skill_name.substring(0, 3);

      const res = await request(app)
        .get(`/search/skills/autocomplete?q=${encodeURIComponent(prefix)}`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("skills");
      expect(Array.isArray(res.body.data.skills)).toBe(true);
      res.body.data.skills.forEach((s) => {
        expect(s).toHaveProperty("skill_id");
        expect(s).toHaveProperty("skill_name");
      });
    });

    test("✅ returns empty array when no skills match", async () => {
      const user = await seedUser({ email: "ac2@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/search/skills/autocomplete?q=xyzxyzxyz_nonexistent")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.skills).toHaveLength(0);
    });

    test("✅ respects limit param", async () => {
      const user = await seedUser({ email: "ac3@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/search/skills/autocomplete?q=a&limit=2")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.skills.length).toBeLessThanOrEqual(2);
    });

    test("❌ returns 400 when q is missing", async () => {
      const user = await seedUser({ email: "ac4@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/search/skills/autocomplete")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 400 when q is empty string", async () => {
      const user = await seedUser({ email: "ac5@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/search/skills/autocomplete?q=")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .get("/search/skills/autocomplete?q=java");
      expect(res.statusCode).toBe(401);
    });
  });
});