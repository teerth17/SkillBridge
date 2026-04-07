// tests/integration/session.routes.test.js
import request from "supertest";
import app from "../setup/testApp.js";
import {
  cleanDB,
  seedUser,
  seedConnection,
  seedSession,
  seedCompletedVideoCall,
  closeDB,
} from "../setup/testDb.js";

// ------------------------------------------------
// Auth middleware in session-service calls the Auth
// service over HTTP. We mock global fetch so tests
// don't need the Auth service running.
// ------------------------------------------------
function mockAuthFetch(userId, role = "user") {
  global.fetch = async (url, opts) => {
    // Intercept only the auth validate-token call
    if (url.includes("/auth/validate-token")) {
      return {
        ok: true,
        json: async () => ({
          data: { valid: true, userId, email: "test@example.com", role },
        }),
      };
    }
    // For Profile service promote-to-mentor call in internal controller
    if (url.includes("/promote-to-mentor")) {
      return {
        ok: true,
        json: async () => ({ data: { role: "mentor" } }),
      };
    }
    // Default fallback
    return { ok: false, json: async () => ({}) };
  };
}

function makeToken(userId) {
  return `fake-token-for-user-${userId}`;
}

const internalHeader = { "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN };

describe("Session Service - Integration", () => {

  beforeEach(async () => {
    await cleanDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  // ================================================
  // Connection Routes
  // ================================================
  describe("POST /connections", () => {

    test("✅ creates a new connection", async () => {
      const user1 = await seedUser({ email: "c1@example.com" });
      const user2 = await seedUser({ email: "c2@example.com" });
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .post("/connections")
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`)
        .send({ receiverId: user2.user_id });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.connection).toHaveProperty("connection_id");
      expect(res.body.data.connection).toHaveProperty("status", "pending");
    });

    test("✅ returns existing connection idempotently", async () => {
      const user1 = await seedUser({ email: "idem1@example.com" });
      const user2 = await seedUser({ email: "idem2@example.com" });
      await seedConnection(user1.user_id, user2.user_id);
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .post("/connections")
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`)
        .send({ receiverId: user2.user_id });

      expect(res.statusCode).toBe(200); // existing returned
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .post("/connections")
        .send({ receiverId: 2 });

      expect(res.statusCode).toBe(401);
    });

    test("❌ cannot connect with yourself", async () => {
      const user = await seedUser({ email: "self@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .post("/connections")
        .set("Authorization", `Bearer ${makeToken(user.user_id)}`)
        .send({ receiverId: user.user_id });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /connections/me", () => {

    test("✅ returns my connections", async () => {
      const user1 = await seedUser({ email: "me1@example.com" });
      const user2 = await seedUser({ email: "me2@example.com" });
      await seedConnection(user1.user_id, user2.user_id);
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .get("/connections/me")
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.connections).toHaveLength(1);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app).get("/connections/me");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("PATCH /connections/:connectionId/status", () => {

    test("✅ accepts a pending connection", async () => {
      const user1 = await seedUser({ email: "acc1@example.com" });
      const user2 = await seedUser({ email: "acc2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "pending");
      mockAuthFetch(user2.user_id); // receiver accepts

      const res = await request(app)
        .patch(`/connections/${conn.connection_id}/status`)
        .set("Authorization", `Bearer ${makeToken(user2.user_id)}`)
        .send({ status: "accepted" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.connection).toHaveProperty("status", "accepted");
    });

    test("❌ returns 403 for non-participant", async () => {
      const user1 = await seedUser({ email: "np1@example.com" });
      const user2 = await seedUser({ email: "np2@example.com" });
      const outsider = await seedUser({ email: "out@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id);
      mockAuthFetch(outsider.user_id);

      const res = await request(app)
        .patch(`/connections/${conn.connection_id}/status`)
        .set("Authorization", `Bearer ${makeToken(outsider.user_id)}`)
        .send({ status: "accepted" });

      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 404 for non-existent connection", async () => {
      const user = await seedUser({ email: "ghost@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .patch("/connections/99999/status")
        .set("Authorization", `Bearer ${makeToken(user.user_id)}`)
        .send({ status: "accepted" });

      expect(res.statusCode).toBe(404);
    });
  });

  // ================================================
  // Session Routes
  // ================================================
  describe("POST /sessions", () => {

    test("✅ creates session from accepted connection", async () => {
      const user1 = await seedUser({ email: "s1@example.com" });
      const user2 = await seedUser({ email: "s2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "accepted");
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .post("/sessions")
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`)
        .send({ connectionId: conn.connection_id });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.session).toHaveProperty("session_id");
      expect(res.body.data.session).toHaveProperty("session_status", "active");
    });

    test("✅ returns existing session idempotently", async () => {
      const user1 = await seedUser({ email: "si1@example.com" });
      const user2 = await seedUser({ email: "si2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "accepted");
      await seedSession(conn.connection_id, user1.user_id, user2.user_id);
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .post("/sessions")
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`)
        .send({ connectionId: conn.connection_id });

      expect(res.statusCode).toBe(200); // existing
    });

    test("❌ returns 400 for pending connection", async () => {
      const user1 = await seedUser({ email: "pend1@example.com" });
      const user2 = await seedUser({ email: "pend2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "pending");
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .post("/sessions")
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`)
        .send({ connectionId: conn.connection_id });

      expect(res.statusCode).toBe(400);
    });

    test("❌ returns 401 without token", async () => {
      const res = await request(app)
        .post("/sessions")
        .send({ connectionId: 1 });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /sessions/me", () => {

    test("✅ returns my sessions", async () => {
      const user1 = await seedUser({ email: "gme1@example.com" });
      const user2 = await seedUser({ email: "gme2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "accepted");
      await seedSession(conn.connection_id, user1.user_id, user2.user_id);
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .get("/sessions/me")
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.sessions).toHaveLength(1);
    });
  });

  describe("GET /sessions/:sessionId", () => {

    test("✅ returns session for participant", async () => {
      const user1 = await seedUser({ email: "gs1@example.com" });
      const user2 = await seedUser({ email: "gs2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "accepted");
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .get(`/sessions/${session.session_id}`)
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.session).toHaveProperty("session_id", session.session_id);
    });

    test("❌ returns 403 for non-participant", async () => {
      const user1 = await seedUser({ email: "gnp1@example.com" });
      const user2 = await seedUser({ email: "gnp2@example.com" });
      const outsider = await seedUser({ email: "gout@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "accepted");
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);
      mockAuthFetch(outsider.user_id);

      const res = await request(app)
        .get(`/sessions/${session.session_id}`)
        .set("Authorization", `Bearer ${makeToken(outsider.user_id)}`);

      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 404 for non-existent session", async () => {
      const user = await seedUser({ email: "gne@example.com" });
      mockAuthFetch(user.user_id);

      const res = await request(app)
        .get("/sessions/99999")
        .set("Authorization", `Bearer ${makeToken(user.user_id)}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /sessions/:sessionId/status", () => {

    test("✅ archives an active session", async () => {
      const user1 = await seedUser({ email: "arch1@example.com" });
      const user2 = await seedUser({ email: "arch2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "accepted");
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .patch(`/sessions/${session.session_id}/status`)
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`)
        .send({ sessionStatus: "archived" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.session).toHaveProperty("session_status", "archived");
    });

    test("❌ invalid status value returns 400", async () => {
      const user1 = await seedUser({ email: "inv1@example.com" });
      const user2 = await seedUser({ email: "inv2@example.com" });
      const conn = await seedConnection(user1.user_id, user2.user_id, "accepted");
      const session = await seedSession(conn.connection_id, user1.user_id, user2.user_id);
      mockAuthFetch(user1.user_id);

      const res = await request(app)
        .patch(`/sessions/${session.session_id}/status`)
        .set("Authorization", `Bearer ${makeToken(user1.user_id)}`)
        .send({ sessionStatus: "deleted" });

      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================
  // Internal Routes
  // ================================================
  describe("POST /internal/video-calls/:videoCallId/completed", () => {

    test("✅ promotes user after first completed call", async () => {
      const mentor = await seedUser({ email: "ment@example.com", role: "mentor" });
      const user = await seedUser({ email: "usr@example.com", role: "user" });
      const conn = await seedConnection(mentor.user_id, user.user_id, "accepted");
      const session = await seedSession(conn.connection_id, mentor.user_id, user.user_id);
      const call = await seedCompletedVideoCall(session.session_id, mentor.user_id);

      // Mock Profile service promote call
      mockAuthFetch(mentor.user_id);

      const res = await request(app)
        .post(`/internal/video-calls/${call.video_call_id}/completed`)
        .set(internalHeader)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("promoted");
    });

    test("❌ returns 401 without internal token", async () => {
      const res = await request(app)
        .post("/internal/video-calls/1/completed")
        .send({});
      expect(res.statusCode).toBe(401);
    });

    test("❌ returns 403 with wrong internal token", async () => {
      const res = await request(app)
        .post("/internal/video-calls/1/completed")
        .set({ "x-internal-token": "wrong" })
        .send({});
      expect(res.statusCode).toBe(403);
    });

    test("❌ returns 404 for non-existent video call", async () => {
      const res = await request(app)
        .post("/internal/video-calls/99999/completed")
        .set(internalHeader)
        .send({});
      expect(res.statusCode).toBe(404);
    });
  });
});