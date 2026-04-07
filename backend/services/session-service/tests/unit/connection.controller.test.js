// tests/unit/connection.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockGetConnectionById = jest.fn();
const mockGetConnectionBetweenUsers = jest.fn();
const mockListMyConnections = jest.fn();
const mockCreateConnection = jest.fn();
const mockUpdateConnectionStatus = jest.fn();

await jest.unstable_mockModule("../../src/models/connection.model.js", () => ({
  getConnectionById: mockGetConnectionById,
  getConnectionBetweenUsers: mockGetConnectionBetweenUsers,
  listMyConnections: mockListMyConnections,
  createConnection: mockCreateConnection,
  updateConnectionStatus: mockUpdateConnectionStatus,
}));

const ConnectionController = await import("../../src/controllers/connection.controller.js");

// ================================================
// listMyConnections
// ================================================
describe("Connection Controller - listMyConnections", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns list of connections for current user", async () => {
    mockListMyConnections.mockResolvedValue([
      { connection_id: 1, requester_id: 1, receiver_id: 2, status: "pending" },
    ]);

    await ConnectionController.listMyConnections(req, res, next);

    expect(mockListMyConnections).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ returns empty array when no connections", async () => {
    mockListMyConnections.mockResolvedValue([]);
    await ConnectionController.listMyConnections(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ calls next(err) on model error", async () => {
    mockListMyConnections.mockRejectedValue(new Error("DB error"));
    await ConnectionController.listMyConnections(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// createConnection
// ================================================
describe("Connection Controller - createConnection", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 1 },
      body: { receiverId: 2 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ creates a new connection successfully", async () => {
    mockGetConnectionBetweenUsers.mockResolvedValue(null); // no existing
    mockCreateConnection.mockResolvedValue({
      connection_id: 1,
      requester_id: 1,
      receiver_id: 2,
      status: "pending",
    });

    await ConnectionController.createConnection(req, res, next);

    expect(mockCreateConnection).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ returns existing connection idempotently", async () => {
    mockGetConnectionBetweenUsers.mockResolvedValue({
      connection_id: 1,
      requester_id: 1,
      receiver_id: 2,
      status: "pending",
    });

    await ConnectionController.createConnection(req, res, next);

    expect(mockCreateConnection).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ cannot connect with yourself (400)", async () => {
    req.body.receiverId = 1; // same as userId
    await ConnectionController.createConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid input - missing receiverId (400)", async () => {
    req.body = {};
    await ConnectionController.createConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid input - receiverId not a number (400)", async () => {
    req.body = { receiverId: "abc" };
    await ConnectionController.createConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// respondToConnection
// ================================================
describe("Connection Controller - respondToConnection", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { connectionId: "1" },
      user: { userId: 2 }, // receiver
      body: { status: "accepted" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ accepts a connection successfully", async () => {
    mockGetConnectionById.mockResolvedValue({
      connection_id: 1,
      requester_id: 1,
      receiver_id: 2,
      status: "pending",
    });
    mockUpdateConnectionStatus.mockResolvedValue({
      connection_id: 1,
      status: "accepted",
    });

    await ConnectionController.respondToConnection(req, res, next);

    expect(mockUpdateConnectionStatus).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: 1, status: "accepted" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ rejects a connection successfully", async () => {
    req.body.status = "rejected";
    mockGetConnectionById.mockResolvedValue({
      connection_id: 1,
      requester_id: 1,
      receiver_id: 2,
      status: "pending",
    });
    mockUpdateConnectionStatus.mockResolvedValue({
      connection_id: 1,
      status: "rejected",
    });

    await ConnectionController.respondToConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid connectionId returns 400", async () => {
    req.params.connectionId = "abc";
    await ConnectionController.respondToConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ connection not found returns 404", async () => {
    mockGetConnectionById.mockResolvedValue(null);
    await ConnectionController.respondToConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ forbidden when not a participant (403)", async () => {
    mockGetConnectionById.mockResolvedValue({
      connection_id: 1,
      requester_id: 1,
      receiver_id: 2,
      status: "pending",
    });
    req.user = { userId: 99 }; // not a participant
    await ConnectionController.respondToConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ invalid status value returns 400", async () => {
    req.body.status = "maybe"; // not in enum
    mockGetConnectionById.mockResolvedValue({
      connection_id: 1,
      requester_id: 1,
      receiver_id: 2,
      status: "pending",
    });
    await ConnectionController.respondToConnection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});