// tests/integration/profile.routes.test.js
import request from "supertest";
import app from "../setup/testApp.js";
import { cleanDB, seedUser, getFirstSkill, closeDB } from "../setup/testDb.js";
import jwt from "jsonwebtoken";

// Helper: generate a valid JWT for a user
function makeToken(userId, role = "user") {
  return jwt.sign(
    { userId, email: "test@example.com", role },
    process.env.JWT_SECRET
  );
}

// Helper: internal service token header
const internalHeader = { "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN };

describe("Profile Routes - Integration", () => {

  beforeEach(async () => {
    await cleanDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  // ================================================
  // GET /profiles/:userId
  // ================================================
  describe("GET /profiles/:userId", () => {

    test("✅ returns profile for existing user", async () => {
      const user = await seedUser({ email: "get@example.com" });

      const res = await request(app).get(`/profiles/${user.user_id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("userId", user.user_id);
      expect(res.body.data).toHaveProperty("email", "get@example.com");
      expect(res.body.data).toHaveProperty("skills");
      expect(res.body.data).toHaveProperty("badges");
    });

    test("❌ returns 404 for non-existent user", async () => {
      const res = await request(app).get("/profiles/99999");
      expect(res.statusCode).toBe(404);
    });

    test("❌ returns 400 for invalid userId", async () => {
      const res = await request(app).get("/profiles/abc");
      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // PUT /profiles/:userId
  // ================================================
  describe("PUT /profiles/:userId", () => {

    test("✅ updates own profile with valid token", async () => {
      const user = await seedUser({ email: "update@example.com" });
      const token = makeToken(user.user_id);

      const res = await request(app)
        .put(`/profiles/${user.user_id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated Name", bio: "New bio here" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.profile).toHaveProperty("name", "Updated Name");
      expect(res.body.data.profile).toHaveProperty("bio", "New bio here");
    });

    test("❌ returns 401 without token", async () => {
      const user = await seedUser({ email: "noauth@example.com" });

      const res = await request(app)
        .put(`/profiles/${user.user_id}`)
        .send({ name: "Hacker" });

      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 403 when updating another user's profile", async () => {
      const user1 = await seedUser({ email: "user1@example.com" });
      const user2 = await seedUser({ email: "user2@example.com" });
      const token = makeToken(user1.user_id); // token for user1

      const res = await request(app)
        .put(`/profiles/${user2.user_id}`) // trying to update user2
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Intruder" });

      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 400 for invalid input", async () => {
      const user = await seedUser({ email: "badinput@example.com" });
      const token = makeToken(user.user_id);

      const res = await request(app)
        .put(`/profiles/${user.user_id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "" }); // fails min(1)

      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // POST /profiles/:userId/skills
  // ================================================
  describe("POST /profiles/:userId/skills", () => {

    test("✅ adds a skill to own profile", async () => {
      const user = await seedUser({ email: "skill@example.com" });
      const skill = await getFirstSkill();
      const token = makeToken(user.user_id);

      const res = await request(app)
        .post(`/profiles/${user.user_id}/skills`)
        .set("Authorization", `Bearer ${token}`)
        .send({ skillId: skill.skill_id, proficiencyLevel: "Beginner" });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.userSkill).toHaveProperty("skill_id", skill.skill_id);
    });

    test("❌ returns 401 without token", async () => {
      const user = await seedUser({ email: "skillnoauth@example.com" });
      const skill = await getFirstSkill();

      const res = await request(app)
        .post(`/profiles/${user.user_id}/skills`)
        .send({ skillId: skill.skill_id });

      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 403 when adding skill to another user", async () => {
      const user1 = await seedUser({ email: "su1@example.com" });
      const user2 = await seedUser({ email: "su2@example.com" });
      const skill = await getFirstSkill();
      const token = makeToken(user1.user_id);

      const res = await request(app)
        .post(`/profiles/${user2.user_id}/skills`)
        .set("Authorization", `Bearer ${token}`)
        .send({ skillId: skill.skill_id });

      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 400 for missing skillId", async () => {
      const user = await seedUser({ email: "skillbad@example.com" });
      const token = makeToken(user.user_id);

      const res = await request(app)
        .post(`/profiles/${user.user_id}/skills`)
        .set("Authorization", `Bearer ${token}`)
        .send({ proficiencyLevel: "Beginner" }); // no skillId

      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // DELETE /profiles/:userId/skills/:skillId
  // ================================================
  describe("DELETE /profiles/:userId/skills/:skillId", () => {

    test("✅ removes a skill from own profile", async () => {
      const user = await seedUser({ email: "delskill@example.com" });
      const skill = await getFirstSkill();
      const token = makeToken(user.user_id);

      // Add skill first
      await request(app)
        .post(`/profiles/${user.user_id}/skills`)
        .set("Authorization", `Bearer ${token}`)
        .send({ skillId: skill.skill_id });

      // Now remove it
      const res = await request(app)
        .delete(`/profiles/${user.user_id}/skills/${skill.skill_id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });

    test("❌ returns 404 when skill not on profile", async () => {
      const user = await seedUser({ email: "noskill@example.com" });
      const token = makeToken(user.user_id);

      const res = await request(app)
        .delete(`/profiles/${user.user_id}/skills/99999`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    test("❌ returns 403 when removing skill from another user", async () => {
      const user1 = await seedUser({ email: "du1@example.com" });
      const user2 = await seedUser({ email: "du2@example.com" });
      const token = makeToken(user1.user_id);

      const res = await request(app)
        .delete(`/profiles/${user2.user_id}/skills/1`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ================================================
  // GET /profiles/:userId/badges
  // ================================================
  describe("GET /profiles/:userId/badges", () => {

    test("✅ returns empty badges for new user", async () => {
      const user = await seedUser({ email: "badges@example.com" });

      const res = await request(app).get(`/profiles/${user.user_id}/badges`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.badges).toEqual([]);
    });

    test("❌ returns 404 for non-existent user", async () => {
      const res = await request(app).get("/profiles/99999/badges");
      expect(res.statusCode).toBe(404);
    });
  });

  // ================================================
  // POST /profiles/:userId/promote-to-mentor (internal)
  // ================================================
  describe("POST /profiles/:userId/promote-to-mentor", () => {

    test("✅ promotes user to mentor with valid internal token", async () => {
      const user = await seedUser({ email: "promote@example.com", role: "user" });

      const res = await request(app)
        .post(`/profiles/${user.user_id}/promote-to-mentor`)
        .set(internalHeader);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("role", "mentor");
    });

    test("❌ returns 401 without internal token", async () => {
      const user = await seedUser({ email: "nointernal@example.com" });

      const res = await request(app)
        .post(`/profiles/${user.user_id}/promote-to-mentor`);

      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 403 with wrong internal token", async () => {
      const user = await seedUser({ email: "wrongtoken@example.com" });

      const res = await request(app)
        .post(`/profiles/${user.user_id}/promote-to-mentor`)
        .set({ "x-internal-token": "wrong_token" });

      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/profiles/99999/promote-to-mentor")
        .set(internalHeader);

      expect(res.statusCode).toBe(404);
    });
  });
});