// tests/unit/session.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockGetConnectionById = jest.fn();
const mockGetSessionById = jest.fn();
const mockGetSessionByConnection = jest.fn();
const mockListSessionsForUser = jest.fn();
const mockCreateSession = jest.fn();
const mockUpdateSessionStatus = jest.fn();

await jest.unstable_mockModule("../../src/models/connection.model.js", () => ({
  getConnectionById: mockGetConnectionById,
}));

await jest.unstable_mockModule("../../src/models/session.model.js", () => ({
  getSessionById: mockGetSessionById,
  getSessionByConnection: mockGetSessionByConnection,
  listSessionsForUser: mockListSessionsForUser,
  createSession: mockCreateSession,
  updateSessionStatus: mockUpdateSessionStatus,
  touchSession: jest.fn(),
}));

const SessionController = await import("../../src/controllers/session.controller.js");

// ================================================
// listMySessions
// ================================================
describe("Session Controller - listMySessions", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns sessions for current user", async () => {
    mockListSessionsForUser.mockResolvedValue([
      { session_id: 1, user1_id: 1, user2_id: 2, session_status: "active" },
    ]);

    await SessionController.listMySessions(req, res, next);

    expect(mockListSessionsForUser).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ returns empty array when no sessions", async () => {
    mockListSessionsForUser.mockResolvedValue([]);
    await SessionController.listMySessions(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ================================================
// getSession
// ================================================
describe("Session Controller - getSession", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { sessionId: "1" },
      user: { userId: 1 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns session for participant", async () => {
    mockGetSessionById.mockResolvedValue({
      session_id: 1,
      user1_id: 1,
      user2_id: 2,
      session_status: "active",
    });

    await SessionController.getSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid sessionId returns 400", async () => {
    req.params.sessionId = "abc";
    await SessionController.getSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ session not found returns 404", async () => {
    mockGetSessionById.mockResolvedValue(null);
    await SessionController.getSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ forbidden when not a participant (403)", async () => {
    mockGetSessionById.mockResolvedValue({
      session_id: 1,
      user1_id: 1,
      user2_id: 2,
      session_status: "active",
    });
    req.user = { userId: 99 }; // not a participant
    await SessionController.getSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ================================================
// createOrGetSession
// ================================================
describe("Session Controller - createOrGetSession", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 1 },
      body: { connectionId: 10 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ creates a new session for accepted connection", async () => {
    mockGetConnectionById.mockResolvedValue({
      connection_id: 10,
      requester_id: 1,
      receiver_id: 2,
      status: "accepted",
    });
    mockGetSessionByConnection.mockResolvedValue(null); // no existing
    mockCreateSession.mockResolvedValue({
      session_id: 1,
      connection_id: 10,
      user1_id: 1,
      user2_id: 2,
      session_status: "active",
    });

    await SessionController.createOrGetSession(req, res, next);

    expect(mockCreateSession).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ returns existing session idempotently (200)", async () => {
    mockGetConnectionById.mockResolvedValue({
      connection_id: 10,
      requester_id: 1,
      receiver_id: 2,
      status: "accepted",
    });
    mockGetSessionByConnection.mockResolvedValue({
      session_id: 1,
      connection_id: 10,
      session_status: "active",
    });

    await SessionController.createOrGetSession(req, res, next);

    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid input returns 400", async () => {
    req.body = {}; // missing connectionId
    await SessionController.createOrGetSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ connection not found returns 404", async () => {
    mockGetConnectionById.mockResolvedValue(null);
    await SessionController.createOrGetSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ forbidden when not a participant (403)", async () => {
    mockGetConnectionById.mockResolvedValue({
      connection_id: 10,
      requester_id: 3,
      receiver_id: 4,
      status: "accepted",
    });
    await SessionController.createOrGetSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ connection not accepted returns 400", async () => {
    mockGetConnectionById.mockResolvedValue({
      connection_id: 10,
      requester_id: 1,
      receiver_id: 2,
      status: "pending", // not accepted
    });
    await SessionController.createOrGetSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// updateSessionStatus
// ================================================
describe("Session Controller - updateSessionStatus", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { sessionId: "1" },
      user: { userId: 1 },
      body: { sessionStatus: "archived" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ updates session status successfully", async () => {
    mockGetSessionById.mockResolvedValue({
      session_id: 1,
      user1_id: 1,
      user2_id: 2,
      session_status: "active",
    });
    mockUpdateSessionStatus.mockResolvedValue({
      session_id: 1,
      session_status: "archived",
    });

    await SessionController.updateSessionStatus(req, res, next);

    expect(mockUpdateSessionStatus).toHaveBeenCalledWith(1, "archived");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid sessionId returns 400", async () => {
    req.params.sessionId = "abc";
    await SessionController.updateSessionStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid status value returns 400", async () => {
    req.body.sessionStatus = "deleted"; // not in enum
    mockGetSessionById.mockResolvedValue({
      session_id: 1,
      user1_id: 1,
      user2_id: 2,
    });
    await SessionController.updateSessionStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ session not found returns 404", async () => {
    mockGetSessionById.mockResolvedValue(null);
    await SessionController.updateSessionStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ forbidden when not a participant (403)", async () => {
    mockGetSessionById.mockResolvedValue({
      session_id: 1,
      user1_id: 1,
      user2_id: 2,
    });
    req.user = { userId: 99 };
    await SessionController.updateSessionStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});