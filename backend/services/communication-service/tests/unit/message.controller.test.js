// tests/unit/message.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockValidateUserInSession = jest.fn();
const mockListMessages = jest.fn();
const mockCreateMessage = jest.fn();
const mockMarkAllRead = jest.fn();

await jest.unstable_mockModule("../../src/models/session.model.js", () => ({
  validateUserInSession: mockValidateUserInSession,
}));

await jest.unstable_mockModule("../../src/models/message.model.js", () => ({
  listMessages: mockListMessages,
  createMessage: mockCreateMessage,
  markAllRead: mockMarkAllRead,
}));

const MessageController = await import("../../src/controllers/message.controller.js");

// ================================================
// getMessages
// ================================================
describe("Message Controller - getMessages", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { sessionId: "1" },
      headers: { authorization: "Bearer fake-token" },
      user: { userId: 1 },
      query: {},
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns messages for valid session participant", async () => {
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 1, user1_id: 1, user2_id: 2 },
    });
    mockListMessages.mockResolvedValue([
      { message_id: 1, session_id: 1, sender_id: 1, message_text: "Hello", is_read: false },
    ]);

    await MessageController.getMessages(req, res, next);

    expect(mockValidateUserInSession).toHaveBeenCalledWith({
      token: "fake-token",
      sessionId: 1,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ messages: expect.any(Array) }) })
    );
  });

  test("✅ returns empty messages array for new session", async () => {
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    mockListMessages.mockResolvedValue([]);

    await MessageController.getMessages(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid sessionId returns 400", async () => {
    req.params.sessionId = "abc";
    await MessageController.getMessages(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 403 when user is not a session participant", async () => {
    mockValidateUserInSession.mockResolvedValue({
      ok: false,
      error: "Invalid session",
    });

    await MessageController.getMessages(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ calls next(err) on model error", async () => {
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    mockListMessages.mockRejectedValue(new Error("DB error"));

    await MessageController.getMessages(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// postMessage
// ================================================
describe("Message Controller - postMessage", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { sessionId: "1" },
      headers: { authorization: "Bearer fake-token" },
      user: { userId: 1 },
      body: { text: "Hello there!" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ posts a message successfully", async () => {
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    mockCreateMessage.mockResolvedValue({
      message_id: 1,
      session_id: 1,
      sender_id: 1,
      message_text: "Hello there!",
      message_type: "text",
      is_read: false,
      sent_at: new Date().toISOString(),
    });

    await MessageController.postMessage(req, res, next);

    expect(mockCreateMessage).toHaveBeenCalledWith({
      sessionId: 1,
      senderId: 1,
      messageText: "Hello there!",
      messageType: "text",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ posts a system message with explicit messageType", async () => {
    req.body = { text: "Session started", messageType: "system" };
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    mockCreateMessage.mockResolvedValue({
      message_id: 2,
      message_type: "system",
    });

    await MessageController.postMessage(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("❌ invalid sessionId returns 400", async () => {
    req.params.sessionId = "xyz";
    await MessageController.postMessage(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ empty text returns 400", async () => {
    req.body = { text: "" };
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    await MessageController.postMessage(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ missing text returns 400", async () => {
    req.body = {};
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    await MessageController.postMessage(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 403 when not a session participant", async () => {
    mockValidateUserInSession.mockResolvedValue({
      ok: false,
      error: "Invalid session",
    });
    await MessageController.postMessage(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ================================================
// markRead
// ================================================
describe("Message Controller - markRead", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { sessionId: "1" },
      headers: { authorization: "Bearer fake-token" },
      user: { userId: 2 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ marks messages as read successfully", async () => {
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    mockMarkAllRead.mockResolvedValue(3);

    await MessageController.markRead(req, res, next);

    expect(mockMarkAllRead).toHaveBeenCalledWith({ sessionId: 1, readerId: 2 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ updated: 3 }) })
    );
  });

  test("✅ returns 0 when no unread messages", async () => {
    mockValidateUserInSession.mockResolvedValue({ ok: true, session: {} });
    mockMarkAllRead.mockResolvedValue(0);

    await MessageController.markRead(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid sessionId returns 400", async () => {
    req.params.sessionId = "abc";
    await MessageController.markRead(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 403 when not a session participant", async () => {
    mockValidateUserInSession.mockResolvedValue({
      ok: false,
      error: "Invalid session",
    });
    await MessageController.markRead(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});