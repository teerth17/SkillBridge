// tests/integration/analytics.routes.test.js
import request from "supertest";
import app from "../setup/testApp.js";
import {
  cleanDB,
  seedUser,
  seedConnection,
  seedSession,
  seedCompletedVideoCall,
  seedReview,
  seedUserSkill,
  closeDB,
} from "../setup/testDb.js";

// Mock Auth service fetch
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

describe("Analytics Service - Integration", () => {

  beforeEach(async () => {
    await cleanDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  // ================================================
  // GET /analytics/dashboard
  // ================================================
  describe("GET /analytics/dashboard", () => {

    test("✅ returns dashboard for authenticated user", async () => {
      const user = await seedUser({ email: "dash@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/dashboard")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("completedCalls");
      expect(res.body.data).toHaveProperty("totalReviews");
      expect(res.body.data).toHaveProperty("avgRating");
      expect(res.body.data).toHaveProperty("skills");
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).get("/analytics/dashboard");
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // GET /analytics/users/:userId/stats
  // ================================================
  describe("GET /analytics/users/:userId/stats", () => {

    test("✅ returns stats for user with no activity", async () => {
      const user = await seedUser({ email: "stats@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get(`/analytics/users/${user.user_id}/stats`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("sessionsAttended", 0);
      expect(res.body.data).toHaveProperty("totalHours", 0);
      expect(res.body.data).toHaveProperty("skillsPracticed");
    });

    test("✅ returns correct stats after sessions and skills", async () => {
      const mentor = await seedUser({ email: "sm@example.com", role: "mentor" });
      const user = await seedUser({ email: "su@example.com" });
      await seedUserSkill(user.user_id, "JavaScript");
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      await seedCompletedVideoCall(session.session_id, mentor.user_id);
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get(`/analytics/users/${user.user_id}/stats`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.sessionsAttended).toBeGreaterThanOrEqual(1);
      expect(res.body.data.skillsPracticed).toContain("JavaScript");
    });

    test("❌ invalid userId returns 400", async () => {
      const user = await seedUser({ email: "inv@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/users/abc/stats")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).get("/analytics/users/1/stats");
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // GET /analytics/mentors/:mentorId/stats
  // ================================================
  describe("GET /analytics/mentors/:mentorId/stats", () => {

    test("✅ returns stats for mentor with no activity", async () => {
      const mentor = await seedUser({ email: "mstats@example.com", role: "mentor" });
      mockAuthFetch(mentor.user_id, "mentor");

      const res = await request(app)
        .get(`/analytics/mentors/${mentor.user_id}/stats`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("sessionsHosted", 0);
      expect(res.body.data).toHaveProperty("totalMentees", 0);
      expect(res.body.data).toHaveProperty("avgRating");
      expect(res.body.data).toHaveProperty("skillPopularity");
    });

    test("✅ returns correct stats after completed sessions", async () => {
      const mentor = await seedUser({ email: "ma@example.com", role: "mentor" });
      const user = await seedUser({ email: "ua@example.com" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);
      await seedReview(call.video_call_id, user.user_id, mentor.user_id, 5);
      mockAuthFetch(mentor.user_id, "mentor");

      const res = await request(app)
        .get(`/analytics/mentors/${mentor.user_id}/stats`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.sessionsHosted).toBe(1);
      expect(res.body.data.totalMentees).toBe(1);
      expect(res.body.data.avgRating).toBe(5);
      expect(res.body.data.totalReviews).toBe(1);
    });

    test("❌ invalid mentorId returns 400", async () => {
      const user = await seedUser({ email: "inv2@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/mentors/abc/stats")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // GET /analytics/users/:userId/badge-eligibility
  // ================================================
  describe("GET /analytics/users/:userId/badge-eligibility", () => {

    test("✅ returns no eligible badges for new user", async () => {
      const user = await seedUser({ email: "badge@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get(`/analytics/users/${user.user_id}/badge-eligibility`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("eligibleBadges");
      expect(res.body.data).toHaveProperty("completedCalls");
      expect(res.body.data).toHaveProperty("avgRating");
      expect(res.body.data.eligibleBadges).toHaveLength(0);
    });

    test("✅ returns New Mentor badge after first completed call", async () => {
      const mentor = await seedUser({ email: "newm@example.com", role: "mentor" });
      const user = await seedUser({ email: "newu@example.com" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      await seedCompletedVideoCall(session.session_id, mentor.user_id);
      mockAuthFetch(mentor.user_id, "mentor");

      const res = await request(app)
        .get(`/analytics/users/${mentor.user_id}/badge-eligibility`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.completedCalls).toBeGreaterThanOrEqual(1);
      const badgeNames = res.body.data.eligibleBadges.map(b => b.badgeName);
      expect(badgeNames).toContain("New Mentor");
    });

    test("❌ invalid userId returns 400", async () => {
      const user = await seedUser({ email: "inv3@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/users/abc/badge-eligibility")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // GET /analytics/platform
  // ================================================
  describe("GET /analytics/platform", () => {

    test("✅ returns platform stats", async () => {
      const user = await seedUser({ email: "plat@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/platform")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("total_users");
      expect(res.body.data).toHaveProperty("total_mentors");
      expect(res.body.data).toHaveProperty("total_calls");
      expect(res.body.data).toHaveProperty("completed_calls");
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).get("/analytics/platform");
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // GET /analytics/top-mentors
  // ================================================
  describe("GET /analytics/top-mentors", () => {

    test("✅ returns top mentors", async () => {
      const user = await seedUser({ email: "tm@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/top-mentors")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("✅ respects limit param", async () => {
      const user = await seedUser({ email: "tml@example.com" });
      await seedUser({ email: "m1@example.com", role: "mentor" });
      await seedUser({ email: "m2@example.com", role: "mentor" });
      await seedUser({ email: "m3@example.com", role: "mentor" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/top-mentors?limit=2")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  // ================================================
  // GET /analytics/top-skills
  // ================================================
  describe("GET /analytics/top-skills", () => {

    test("✅ returns top skills", async () => {
      const user = await seedUser({ email: "ts@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/analytics/top-skills")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ================================================
  // POST /analytics/:videoCallId/reviews
  // ================================================
  describe("POST /analytics/:videoCallId/reviews", () => {

    test("✅ creates a review successfully", async () => {
      const mentor = await seedUser({ email: "rev_m@example.com", role: "mentor" });
      const user = await seedUser({ email: "rev_u@example.com" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .post(`/analytics/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token")
        .send({ revieweeId: mentor.user_id, rating: 5, feedbackText: "Amazing!" });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.review).toHaveProperty("rating", 5);
      expect(res.body.data.review).toHaveProperty("reviewer_id", user.user_id);
      expect(res.body.data.review).toHaveProperty("reviewee_id", mentor.user_id);
    });

    test("❌ cannot review yourself", async () => {
      const mentor = await seedUser({ email: "self@example.com", role: "mentor" });
      const user = await seedUser({ email: "selfu@example.com" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .post(`/analytics/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token")
        .send({ revieweeId: user.user_id, rating: 5 }); // reviewing self

      expect(res.statusCode).toBe(400);
    });

    test("❌ invalid rating returns 400", async () => {
      const user = await seedUser({ email: "invrat@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .post("/analytics/1/reviews")
        .set("Authorization", "Bearer fake-token")
        .send({ revieweeId: 2, rating: 10 });

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .post("/analytics/1/reviews")
        .send({ revieweeId: 2, rating: 5 });
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // GET /analytics/:videoCallId/reviews
  // ================================================
  describe("GET /analytics/:videoCallId/reviews", () => {

    test("✅ returns reviews for a video call", async () => {
      const mentor = await seedUser({ email: "gr_m@example.com", role: "mentor" });
      const user = await seedUser({ email: "gr_u@example.com" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);
      await seedReview(call.video_call_id, user.user_id, mentor.user_id, 4);
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get(`/analytics/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.reviews).toHaveLength(1);
      expect(res.body.data.reviews[0]).toHaveProperty("rating", 4);
    });

    test("✅ returns empty array for call with no reviews", async () => {
      const mentor = await seedUser({ email: "nr_m@example.com", role: "mentor" });
      const user = await seedUser({ email: "nr_u@example.com" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get(`/analytics/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.reviews).toHaveLength(0);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).get("/analytics/1/reviews");
      expect(res.statusCode).toBe(401);
    });
  });
});