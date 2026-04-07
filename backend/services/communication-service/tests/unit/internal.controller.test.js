// tests/unit/internal.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockCreateMessage = jest.fn();

await jest.unstable_mockModule("../../src/models/message.model.js", () => ({
  createMessage: mockCreateMessage,
  listMessages: jest.fn(),
  markAllRead: jest.fn(),
}));

const InternalController = await import("../../src/controllers/internal.controller.js");

// Helper: build a mock Socket.IO instance that records emitted events
function makeMockIo() {
  const emitted = [];
  return {
    to: () => ({
      emit: (event, data) => emitted.push({ event, data }),
    }),
    _emitted: emitted,
  };
}

// Helper: build req/res/next
function makeReqRes(sessionId = "1", body = {}, io = makeMockIo()) {
  const app = { get: (key) => (key === "io" ? io : null) };
  const req = { params: { sessionId }, body, app };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next, io };
}

// ================================================
// connectionAccepted
// ================================================
describe("Internal Controller - connectionAccepted", () => {

  beforeEach(() => jest.clearAllMocks());

  test("✅ broadcasts connection_accepted and message_received events", async () => {
    const { req, res, next, io } = makeReqRes("1", { actorUserId: 1 });
    mockCreateMessage.mockResolvedValue({
      message_id: 1,
      session_id: 1,
      sender_id: 1,
      message_text: "Connection accepted. You can start chatting now.",
      message_type: "system",
      is_read: false,
      sent_at: new Date().toISOString(),
    });

    await InternalController.connectionAccepted(req, res, next);

    expect(mockCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 1, messageType: "system" })
    );
    expect(io._emitted.map((e) => e.event)).toContain("connection_accepted");
    expect(io._emitted.map((e) => e.event)).toContain("message_received");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid sessionId returns 400", async () => {
    const { req, res, next } = makeReqRes("abc", { actorUserId: 1 });
    await InternalController.connectionAccepted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ missing actorUserId returns 400", async () => {
    const { req, res, next } = makeReqRes("1", {});
    await InternalController.connectionAccepted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 500 when io is not available", async () => {
    const app = { get: () => null }; // no io
    const req = { params: { sessionId: "1" }, body: { actorUserId: 1 }, app };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    mockCreateMessage.mockResolvedValue({ message_id: 1, session_id: 1, sender_id: 1, message_text: "", message_type: "system", is_read: false, sent_at: new Date() });

    await InternalController.connectionAccepted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ================================================
// videoCallCreated
// ================================================
describe("Internal Controller - videoCallCreated", () => {

  beforeEach(() => jest.clearAllMocks());

  test("✅ broadcasts video_call_initiated and message_received events", async () => {
    const { req, res, next, io } = makeReqRes("1", {
      actorUserId: 1,
      videoCallId: 10,
      meetingUrl: "http://jitsi/room-1",
    });
    mockCreateMessage.mockResolvedValue({
      message_id: 2,
      session_id: 1,
      sender_id: 1,
      message_text: "Video call started. Join: http://jitsi/room-1",
      message_type: "system",
      is_read: false,
      sent_at: new Date().toISOString(),
    });

    await InternalController.videoCallCreated(req, res, next);

    expect(io._emitted.map((e) => e.event)).toContain("video_call_initiated");
    expect(io._emitted.map((e) => e.event)).toContain("message_received");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ works without optional meetingUrl", async () => {
    const { req, res, next } = makeReqRes("1", {
      actorUserId: 1,
      videoCallId: 10,
    });
    mockCreateMessage.mockResolvedValue({
      message_id: 3, session_id: 1, sender_id: 1,
      message_text: "Video call started.", message_type: "system",
      is_read: false, sent_at: new Date().toISOString(),
    });

    await InternalController.videoCallCreated(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid sessionId returns 400", async () => {
    const { req, res, next } = makeReqRes("abc", { actorUserId: 1, videoCallId: 1 });
    await InternalController.videoCallCreated(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ missing required fields returns 400", async () => {
    const { req, res, next } = makeReqRes("1", {}); // missing actorUserId and videoCallId
    await InternalController.videoCallCreated(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// requestReview
// ================================================
describe("Internal Controller - requestReview", () => {

  beforeEach(() => jest.clearAllMocks());

  test("✅ emits review_requested event", async () => {
    const { req, res, next, io } = makeReqRes("1", {
      actorUserId: 1,
      videoCallId: 10,
    });

    await InternalController.requestReview(req, res, next);

    expect(io._emitted.map((e) => e.event)).toContain("review_requested");
    const event = io._emitted.find((e) => e.event === "review_requested");
    expect(event.data).toMatchObject({ sessionId: 1, videoCallId: 10 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("✅ works with empty body (all fields optional)", async () => {
    const { req, res, next } = makeReqRes("1", {});
    await InternalController.requestReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid sessionId returns 400", async () => {
    const { req, res, next } = makeReqRes("abc", {});
    await InternalController.requestReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 500 when io is not available", async () => {
    const app = { get: () => null };
    const req = { params: { sessionId: "1" }, body: {}, app };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await InternalController.requestReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});