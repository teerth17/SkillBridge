// tests/unit/videocall.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockValidateUserInSession = jest.fn();
const mockNotifyCallCompleted = jest.fn();
const mockGetUserRole = jest.fn();
const mockCreateVideoCall = jest.fn();
const mockGetVideoCallById = jest.fn();
const mockListVideoCallsForSession = jest.fn();
const mockMarkStarted = jest.fn();
const mockMarkEnded = jest.fn();

await jest.unstable_mockModule("../../src/models/session.model.js", () => ({
  validateUserInSession: mockValidateUserInSession,
  notifyCallCompleted: mockNotifyCallCompleted,
}));

await jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  getUserRole: mockGetUserRole,
}));

await jest.unstable_mockModule("../../src/models/videocall.model.js", () => ({
  createVideoCall: mockCreateVideoCall,
  getVideoCallById: mockGetVideoCallById,
  listVideoCallsForSession: mockListVideoCallsForSession,
  markStarted: mockMarkStarted,
  markEnded: mockMarkEnded,
}));

// Mock fetch for Communication service notifications
global.fetch = jest.fn();

const VideoCallController = await import("../../src/controllers/videocall.controller.js");

// Helper: mock fetch to succeed for all external calls
function mockFetchSuccess() {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
}

// ================================================
// createCall
// ================================================
describe("VideoCall Controller - createCall", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 1 },
      token: "fake-token",
      body: { sessionId: 10 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
    mockFetchSuccess();
  });

  test("✅ creates call when one participant is mentor", async () => {
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" }) // u1
      .mockResolvedValueOnce({ user_id: 2, role: "user" });  // u2
    mockCreateVideoCall.mockResolvedValue({
      video_call_id: 1,
      session_id: 10,
      mentor_user_id: 1,
      meeting_url: "http://jitsi/room",
      jitsi_room_id: "room-1",
      status: "pending",
      topic: null,
      start_time: null,
    });

    await VideoCallController.createCall(req, res, next);

    expect(mockCreateVideoCall).toHaveBeenCalledWith(
      expect.objectContaining({ mentorUserId: 1, sessionId: 10 })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ uses explicit mentorUserId when both are same role", async () => {
    req.body = { sessionId: 10, mentorUserId: 2 };
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" })
      .mockResolvedValueOnce({ user_id: 2, role: "mentor" }); // both mentors
    mockCreateVideoCall.mockResolvedValue({
      video_call_id: 1, session_id: 10, mentor_user_id: 2,
      meeting_url: "http://jitsi/room", jitsi_room_id: "room-1",
      status: "pending", topic: null, start_time: null,
    });

    await VideoCallController.createCall(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("❌ invalid input returns 400", async () => {
    req.body = {}; // missing sessionId
    await VideoCallController.createCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 403 when not a session participant", async () => {
    mockValidateUserInSession.mockResolvedValue({ ok: false, error: "Invalid session" });
    await VideoCallController.createCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ returns 404 when participant not found in DB", async () => {
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockGetUserRole
      .mockResolvedValueOnce(null) // u1 not found
      .mockResolvedValueOnce({ user_id: 2, role: "user" });

    await VideoCallController.createCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ returns 400 when mentor ambiguous and no mentorUserId provided", async () => {
    req.body = { sessionId: 10 }; // no mentorUserId
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "user" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" }); // both users, ambiguous

    await VideoCallController.createCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 400 when mentorUserId is not a participant", async () => {
    req.body = { sessionId: 10, mentorUserId: 99 }; // not in session
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" })
      .mockResolvedValueOnce({ user_id: 2, role: "mentor" });

    await VideoCallController.createCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// startCall
// ================================================
describe("VideoCall Controller - startCall", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { videoCallId: "1" },
      user: { userId: 1 },
      token: "fake-token",
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ starts a pending call successfully", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, status: "pending" });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockMarkStarted.mockResolvedValue({ video_call_id: 1, session_id: 10, status: "active" });

    await VideoCallController.startCall(req, res, next);

    expect(mockMarkStarted).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid videoCallId returns 400", async () => {
    req.params.videoCallId = "abc";
    await VideoCallController.startCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ video call not found returns 404", async () => {
    mockGetVideoCallById.mockResolvedValue(null);
    await VideoCallController.startCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ returns 403 when not a session participant", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockValidateUserInSession.mockResolvedValue({ ok: false, error: "Invalid session" });
    await VideoCallController.startCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ================================================
// endCall
// ================================================
describe("VideoCall Controller - endCall", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { videoCallId: "1" },
      user: { userId: 1 },
      token: "fake-token",
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
    mockFetchSuccess();
  });

  test("✅ ends an active call successfully", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, status: "active" });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockMarkEnded.mockResolvedValue({
      video_call_id: 1, session_id: 10, status: "completed",
      end_time: new Date(), duration_minutes: 30,
    });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" });
    mockNotifyCallCompleted.mockResolvedValue({ ok: true });

    await VideoCallController.endCall(req, res, next);

    expect(mockMarkEnded).toHaveBeenCalledWith(1);
    expect(mockNotifyCallCompleted).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid videoCallId returns 400", async () => {
    req.params.videoCallId = "abc";
    await VideoCallController.endCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ video call not found returns 404", async () => {
    mockGetVideoCallById.mockResolvedValue(null);
    await VideoCallController.endCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ returns 403 when not a session participant", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockValidateUserInSession.mockResolvedValue({ ok: false, error: "Invalid session" });
    await VideoCallController.endCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ returns 400 when call already ended", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, status: "completed" });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockMarkEnded.mockResolvedValue(null); // already ended

    await VideoCallController.endCall(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// listCallsForSession
// ================================================
describe("VideoCall Controller - listCallsForSession", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { sessionId: "10" },
      user: { userId: 1 },
      token: "fake-token",
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns list of calls for session participant", async () => {
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockListVideoCallsForSession.mockResolvedValue([
      { video_call_id: 1, session_id: 10, status: "completed" },
    ]);

    await VideoCallController.listCallsForSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ videoCalls: expect.any(Array) }) })
    );
  });

  test("❌ invalid sessionId returns 400", async () => {
    req.params.sessionId = "abc";
    await VideoCallController.listCallsForSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 403 when not a session participant", async () => {
    mockValidateUserInSession.mockResolvedValue({ ok: false, error: "Invalid session" });
    await VideoCallController.listCallsForSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});