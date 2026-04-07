// tests/integration/videocall.routes.test.js
import request from "supertest";
import app from "../setup/testApp.js";
import {
  cleanDB,
  seedUser,
  seedConnection,
  seedSession,
  seedVideoCall,
  seedCompletedVideoCall,
  closeDB,
} from "../setup/testDb.js";

// ------------------------------------------------
// Three external HTTP calls need mocking:
// 1. Auth middleware   → GET /auth/validate-token
// 2. Session gate      → GET /sessions/:sessionId
// 3. Communication     → POST /communication/internal/...
// 4. Session notify    → POST /internal/video-calls/:id/completed
// ------------------------------------------------
function mockFetch({ userId, role = "user", session = null, commOk = true, sessionNotifyOk = true }) {
  global.fetch = async (url) => {
    if (url.includes("/auth/validate-token")) {
      return {
        ok: true,
        json: async () => ({
          data: { valid: true, userId, email: "test@example.com", role },
        }),
      };
    }
    if (url.includes("/sessions/")) {
      if (!session) {
        return { ok: false, json: async () => ({ error: { message: "Invalid session" } }) };
      }
      return { ok: true, json: async () => ({ data: { session } }) };
    }
    if (url.includes("/communication/internal")) {
      return { ok: commOk, json: async () => ({}) };
    }
    if (url.includes("/internal/video-calls")) {
      return { ok: sessionNotifyOk, json: async () => ({ data: { promoted: false } }) };
    }
    return { ok: false, json: async () => ({}) };
  };
}

describe("Video Call Service - Integration", () => {

  beforeEach(async () => {
    await cleanDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  // ================================================
  // POST /video-calls
  // ================================================
  describe("POST /video-calls", () => {

    test("✅ creates a video call when one participant is mentor", async () => {
      const mentor = await seedUser({ email: "mentor@example.com", role: "mentor" });
      const user = await seedUser({ email: "user@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);

      mockFetch({
        userId: mentor.user_id,
        role: "mentor",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .post("/video-calls")
        .set("Authorization", "Bearer fake-token")
        .send({ sessionId: session.session_id });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty("videoCallId");
      expect(res.body.data).toHaveProperty("meetingUrl");
      expect(res.body.data).toHaveProperty("status", "pending");
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .post("/video-calls")
        .send({ sessionId: 1 });
      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 400 for missing sessionId", async () => {
      const user = await seedUser({ email: "noSession@example.com" });
      mockFetch({ userId: user.user_id, session: null });

      const res = await request(app)
        .post("/video-calls")
        .set("Authorization", "Bearer fake-token")
        .send({});

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 403 when not a session participant", async () => {
      const user = await seedUser({ email: "outsider@example.com" });
      mockFetch({ userId: user.user_id, session: null });

      const res = await request(app)
        .post("/video-calls")
        .set("Authorization", "Bearer fake-token")
        .send({ sessionId: 99999 });

      expect(res.statusCode).toBe(403);
    });
  });

  // ================================================
  // PATCH /video-calls/:videoCallId/start
  // ================================================
  describe("PATCH /video-calls/:videoCallId/start", () => {

    test("✅ starts a pending video call", async () => {
      const mentor = await seedUser({ email: "sm@example.com", role: "mentor" });
      const user = await seedUser({ email: "su@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedVideoCall(session.session_id, mentor.user_id, { status: "pending" });

      mockFetch({
        userId: mentor.user_id,
        role: "mentor",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .patch(`/video-calls/${call.video_call_id}/start`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.videoCall).toHaveProperty("status", "active");
    });

    test("❌ returns 404 for non-existent call", async () => {
      const user = await seedUser({ email: "notfound@example.com" });
      mockFetch({ userId: user.user_id, session: null });

      const res = await request(app)
        .patch("/video-calls/99999/start")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(404);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).patch("/video-calls/1/start");
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // PATCH /video-calls/:videoCallId/end
  // ================================================
  describe("PATCH /video-calls/:videoCallId/end", () => {

    test("✅ ends an active video call", async () => {
      const mentor = await seedUser({ email: "em@example.com", role: "mentor" });
      const user = await seedUser({ email: "eu@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedVideoCall(session.session_id, mentor.user_id, { status: "active" });

      mockFetch({
        userId: mentor.user_id,
        role: "mentor",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .patch(`/video-calls/${call.video_call_id}/end`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.videoCall).toHaveProperty("status", "completed");
      expect(res.body.data.videoCall).toHaveProperty("end_time");
    });

    test("❌ returns 400 when call already ended", async () => {
      const mentor = await seedUser({ email: "alreadyended@example.com", role: "mentor" });
      const user = await seedUser({ email: "ae2@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);

      mockFetch({
        userId: mentor.user_id,
        role: "mentor",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .patch(`/video-calls/${call.video_call_id}/end`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).patch("/video-calls/1/end");
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // GET /video-calls/sessions/:sessionId
  // ================================================
  describe("GET /video-calls/sessions/:sessionId", () => {

    test("✅ returns calls for a session", async () => {
      const mentor = await seedUser({ email: "ls1@example.com", role: "mentor" });
      const user = await seedUser({ email: "ls2@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      await seedVideoCall(session.session_id, mentor.user_id);

      mockFetch({
        userId: mentor.user_id,
        role: "mentor",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .get(`/video-calls/sessions/${session.session_id}`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.videoCalls).toHaveLength(1);
    });

    test("❌ returns 403 for non-participant", async () => {
      const user = await seedUser({ email: "lsnp@example.com" });
      mockFetch({ userId: user.user_id, session: null });

      const res = await request(app)
        .get("/video-calls/sessions/99999")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).get("/video-calls/sessions/1");
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // POST /video-calls/:videoCallId/reviews
  // ================================================
  describe("POST /video-calls/:videoCallId/reviews", () => {

    test("✅ creates a review after call ends", async () => {
      const mentor = await seedUser({ email: "rev_m@example.com", role: "mentor" });
      const user = await seedUser({ email: "rev_u@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);

      mockFetch({
        userId: user.user_id,
        role: "user",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .post(`/video-calls/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token")
        .send({ revieweeId: mentor.user_id, rating: 5, feedbackText: "Amazing!" });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.review).toHaveProperty("rating", 5);
      expect(res.body.data.review).toHaveProperty("reviewer_id", user.user_id);
      expect(res.body.data.review).toHaveProperty("reviewee_id", mentor.user_id);
    });

    test("❌ returns 400 when call has not ended", async () => {
      const mentor = await seedUser({ email: "rev_ne_m@example.com", role: "mentor" });
      const user = await seedUser({ email: "rev_ne_u@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedVideoCall(session.session_id, mentor.user_id, { status: "active" });

      mockFetch({
        userId: user.user_id,
        role: "user",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .post(`/video-calls/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token")
        .send({ revieweeId: mentor.user_id, rating: 5 });

      expect(res.statusCode).toBe(400);
    });

    test("❌ cannot review yourself", async () => {
      const mentor = await seedUser({ email: "self_m@example.com", role: "mentor" });
      const user = await seedUser({ email: "self_u@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);

      mockFetch({
        userId: user.user_id,
        role: "user",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .post(`/video-calls/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token")
        .send({ revieweeId: user.user_id, rating: 5 }); // reviewing self

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .post("/video-calls/1/reviews")
        .send({ revieweeId: 2, rating: 5 });
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // GET /video-calls/:videoCallId/reviews
  // ================================================
  describe("GET /video-calls/:videoCallId/reviews", () => {

    test("✅ returns reviews for a completed call", async () => {
      const mentor = await seedUser({ email: "lr_m@example.com", role: "mentor" });
      const user = await seedUser({ email: "lr_u@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id);
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);

      mockFetch({
        userId: user.user_id,
        role: "user",
        session: { session_id: session.session_id, user1_id: mentor.user_id, user2_id: user.user_id },
      });

      const res = await request(app)
        .get(`/video-calls/${call.video_call_id}/reviews`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("reviews");
    });

    test("❌ returns 404 for non-existent call", async () => {
      const user = await seedUser({ email: "lr_ne@example.com" });
      mockFetch({ userId: user.user_id, session: null });

      const res = await request(app)
        .get("/video-calls/99999/reviews")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(404);
    });
  });
});