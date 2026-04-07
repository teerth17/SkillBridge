// tests/integration/communication.routes.test.js
import request from "supertest";
import app, { createMockIo, attachMockIo } from "../setup/testApp.js";
import {
  cleanDB,
  seedUser,
  seedConnection,
  seedSession,
  seedMessage,
  closeDB,
} from "../setup/testDb.js";

// ------------------------------------------------
// Two external HTTP calls need mocking:
// 1. Auth middleware  → GET /auth/validate-token
// 2. Session gate     → GET /sessions/:sessionId
// ------------------------------------------------
function mockFetch({ userId, role = "user", session = null }) {
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
        return {
          ok: false,
          json: async () => ({ error: { message: "Invalid session" } }),
        };
      }
      return {
        ok: true,
        json: async () => ({ data: { session } }),
      };
    }
    return { ok: false, json: async () => ({}) };
  };
}

const internalHeader = { "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN };

describe("Communication Service - Integration", () => {

  beforeEach(async () => {
    await cleanDB();
    // Attach a fresh mock io before each test
    attachMockIo(createMockIo());
  });

  afterAll(async () => {
    await closeDB();
  });

  // ================================================
  // GET /communication/sessions/:sessionId/messages
  // ================================================
  describe("GET /communication/sessions/:sessionId/messages", () => {

    test("✅ returns messages for session participant", async () => {
      const user1 = await seedUser({ email: "msg1@example.com" });
      const user2 = await seedUser({ email: "msg2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);
      await seedMessage(session.session_id, user1.user_id, "Hello!");

      mockFetch({
        userId: user1.user_id,
        session: { session_id: session.session_id, user1_id: user1.user_id, user2_id: user2.user_id },
      });

      const res = await request(app)
        .get(`/communication/sessions/${session.session_id}/messages`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.messages[0]).toHaveProperty("message_text", "Hello!");
    });

    test("✅ returns empty array for session with no messages", async () => {
      const user1 = await seedUser({ email: "empty1@example.com" });
      const user2 = await seedUser({ email: "empty2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      mockFetch({
        userId: user1.user_id,
        session: { session_id: session.session_id, user1_id: user1.user_id, user2_id: user2.user_id },
      });

      const res = await request(app)
        .get(`/communication/sessions/${session.session_id}/messages`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.messages).toHaveLength(0);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .get("/communication/sessions/1/messages");
      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 403 for non-participant", async () => {
      const user = await seedUser({ email: "notpart@example.com" });
      mockFetch({ userId: user.user_id, session: null }); // session gate rejects

      const res = await request(app)
        .get("/communication/sessions/99999/messages")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 400 for invalid sessionId", async () => {
      const user = await seedUser({ email: "inv@example.com" });
      mockFetch({ userId: user.user_id });

      const res = await request(app)
        .get("/communication/sessions/abc/messages")
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // POST /communication/sessions/:sessionId/messages
  // ================================================
  describe("POST /communication/sessions/:sessionId/messages", () => {

    test("✅ posts a message and stores it in DB", async () => {
      const user1 = await seedUser({ email: "post1@example.com" });
      const user2 = await seedUser({ email: "post2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      mockFetch({
        userId: user1.user_id,
        session: { session_id: session.session_id, user1_id: user1.user_id, user2_id: user2.user_id },
      });

      const res = await request(app)
        .post(`/communication/sessions/${session.session_id}/messages`)
        .set("Authorization", "Bearer fake-token")
        .send({ text: "Hey there!" });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.message).toHaveProperty("message_text", "Hey there!");
      expect(res.body.data.message).toHaveProperty("message_type", "text");
      expect(res.body.data.message).toHaveProperty("sender_id", user1.user_id);
    });

    test("✅ posts a system message", async () => {
      const user1 = await seedUser({ email: "sys1@example.com" });
      const user2 = await seedUser({ email: "sys2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      mockFetch({
        userId: user1.user_id,
        session: { session_id: session.session_id, user1_id: user1.user_id, user2_id: user2.user_id },
      });

      const res = await request(app)
        .post(`/communication/sessions/${session.session_id}/messages`)
        .set("Authorization", "Bearer fake-token")
        .send({ text: "Session started", messageType: "system" });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.message).toHaveProperty("message_type", "system");
    });

    test("❌ returns 400 for empty text", async () => {
      const user1 = await seedUser({ email: "empt1@example.com" });
      const user2 = await seedUser({ email: "empt2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      mockFetch({
        userId: user1.user_id,
        session: { session_id: session.session_id, user1_id: user1.user_id, user2_id: user2.user_id },
      });

      const res = await request(app)
        .post(`/communication/sessions/${session.session_id}/messages`)
        .set("Authorization", "Bearer fake-token")
        .send({ text: "" });

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .post("/communication/sessions/1/messages")
        .send({ text: "Hi" });
      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 403 for non-participant", async () => {
      const user = await seedUser({ email: "np@example.com" });
      mockFetch({ userId: user.user_id, session: null });

      const res = await request(app)
        .post("/communication/sessions/99999/messages")
        .set("Authorization", "Bearer fake-token")
        .send({ text: "Sneaky message" });

      expect(res.statusCode).toBe(403);
    });
  });

  // ================================================
  // PATCH /communication/sessions/:sessionId/read
  // ================================================
  describe("PATCH /communication/sessions/:sessionId/read", () => {

    test("✅ marks messages as read", async () => {
      const user1 = await seedUser({ email: "read1@example.com" });
      const user2 = await seedUser({ email: "read2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      // user1 sends messages, user2 marks as read
      await seedMessage(session.session_id, user1.user_id, "Message 1");
      await seedMessage(session.session_id, user1.user_id, "Message 2");

      mockFetch({
        userId: user2.user_id,
        session: { session_id: session.session_id, user1_id: user1.user_id, user2_id: user2.user_id },
      });

      const res = await request(app)
        .patch(`/communication/sessions/${session.session_id}/read`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("updated", 2);
    });

    test("✅ returns 0 when no unread messages", async () => {
      const user1 = await seedUser({ email: "noread1@example.com" });
      const user2 = await seedUser({ email: "noread2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      mockFetch({
        userId: user1.user_id,
        session: { session_id: session.session_id, user1_id: user1.user_id, user2_id: user2.user_id },
      });

      const res = await request(app)
        .patch(`/communication/sessions/${session.session_id}/read`)
        .set("Authorization", "Bearer fake-token");

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("updated", 0);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .patch("/communication/sessions/1/read");
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================
  // Internal Routes
  // ================================================
  describe("POST /communication/internal/sessions/:sessionId/connection-accepted", () => {

    test("✅ broadcasts event with valid internal token", async () => {
      const user1 = await seedUser({ email: "ia1@example.com" });
      const user2 = await seedUser({ email: "ia2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      const res = await request(app)
        .post(`/communication/internal/sessions/${session.session_id}/connection-accepted`)
        .set(internalHeader)
        .send({ actorUserId: user1.user_id });

      expect(res.statusCode).toBe(200);
    });

    test("❌ returns 401 without internal token", async () => {
      const res = await request(app)
        .post("/communication/internal/sessions/1/connection-accepted")
        .send({ actorUserId: 1 });
      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 403 with wrong internal token", async () => {
      const res = await request(app)
        .post("/communication/internal/sessions/1/connection-accepted")
        .set({ "x-internal-token": "wrong" })
        .send({ actorUserId: 1 });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("POST /communication/internal/sessions/:sessionId/video-call-created", () => {

    test("✅ broadcasts video call event", async () => {
      const user1 = await seedUser({ email: "vc1@example.com" });
      const user2 = await seedUser({ email: "vc2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      const res = await request(app)
        .post(`/communication/internal/sessions/${session.session_id}/video-call-created`)
        .set(internalHeader)
        .send({ actorUserId: user1.user_id, videoCallId: 1, meetingUrl: "http://jitsi/room" });

      expect(res.statusCode).toBe(200);
    });

    test("❌ returns 401 without internal token", async () => {
      const res = await request(app)
        .post("/communication/internal/sessions/1/video-call-created")
        .send({ actorUserId: 1, videoCallId: 1 });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /communication/internal/sessions/:sessionId/request-review", () => {

    test("✅ emits review_requested event", async () => {
      const user1 = await seedUser({ email: "rr1@example.com" });
      const user2 = await seedUser({ email: "rr2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);

      const res = await request(app)
        .post(`/communication/internal/sessions/${session.session_id}/request-review`)
        .set(internalHeader)
        .send({ actorUserId: user1.user_id, videoCallId: 1 });

      expect(res.statusCode).toBe(200);
    });

    test("❌ returns 401 without internal token", async () => {
      const res = await request(app)
        .post("/communication/internal/sessions/1/request-review")
        .send({});
      expect(res.statusCode).toBe(401);
    });
  });
});