// tests/unit/internal.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockGetVideoCallById = jest.fn();
const mockCountCompletedCallsForUser = jest.fn();
const mockGetSessionById = jest.fn();
const mockGetUserRole = jest.fn();

await jest.unstable_mockModule("../../src/models/videocall.model.js", () => ({
  getVideoCallById: mockGetVideoCallById,
  countCompletedCallsForUser: mockCountCompletedCallsForUser,
}));

await jest.unstable_mockModule("../../src/models/session.model.js", () => ({
  getSessionById: mockGetSessionById,
  touchSession: jest.fn(),
}));

await jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  getUserRole: mockGetUserRole,
}));

// Mock global fetch for the Profile service HTTP call
global.fetch = jest.fn();

const InternalController = await import("../../src/controllers/internal.controller.js");

// ================================================
// onVideoCallCompleted
// ================================================
describe("Internal Controller - onVideoCallCompleted", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { videoCallId: "1" },
      body: {},
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ promotes user after first completed call", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockGetSessionById.mockResolvedValue({ session_id: 10, user1_id: 1, user2_id: 2 });
    // user1 = mentor, user2 = user → promote user2
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" }) // u1
      .mockResolvedValueOnce({ user_id: 2, role: "user" })   // u2
      .mockResolvedValueOnce({ user_id: 2, role: "user" });  // target check
    mockCountCompletedCallsForUser.mockResolvedValue(1); // first call

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { role: "mentor" } }),
    });

    await InternalController.onVideoCallCompleted(req, res, next);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/promote-to-mentor"),
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ promoted: true }) })
    );
  });

  test("✅ skips promotion if user is already a mentor", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockGetSessionById.mockResolvedValue({ session_id: 10, user1_id: 1, user2_id: 2 });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" })
      .mockResolvedValueOnce({ user_id: 2, role: "mentor" }); // already mentor
    mockCountCompletedCallsForUser.mockResolvedValue(1);

    await InternalController.onVideoCallCompleted(req, res, next);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ promoted: false }) })
    );
  });

  test("✅ skips promotion if not first completed call", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockGetSessionById.mockResolvedValue({ session_id: 10, user1_id: 1, user2_id: 2 });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" });
    mockCountCompletedCallsForUser.mockResolvedValue(3); // not first

    await InternalController.onVideoCallCompleted(req, res, next);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ promoted: false }) })
    );
  });

  test("✅ uses explicit promoteUserId when provided", async () => {
    req.body = { promoteUserId: 2 };
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockGetSessionById.mockResolvedValue({ session_id: 10, user1_id: 1, user2_id: 2 });
    mockGetUserRole.mockResolvedValue({ user_id: 2, role: "user" });
    mockCountCompletedCallsForUser.mockResolvedValue(1);

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { role: "mentor" } }),
    });

    await InternalController.onVideoCallCompleted(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ promoted: true }) })
    );
  });

  test("❌ invalid videoCallId returns 400", async () => {
    req.params.videoCallId = "abc";
    await InternalController.onVideoCallCompleted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ video call not found returns 404", async () => {
    mockGetVideoCallById.mockResolvedValue(null);
    await InternalController.onVideoCallCompleted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ session not found returns 404", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockGetSessionById.mockResolvedValue(null);
    await InternalController.onVideoCallCompleted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ ambiguous promotion target (both users) returns 400", async () => {
    req.body = {}; // no promoteUserId
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockGetSessionById.mockResolvedValue({ session_id: 10, user1_id: 1, user2_id: 2 });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "user" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" }); // both users
    await InternalController.onVideoCallCompleted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ profile service failure returns 502", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockGetSessionById.mockResolvedValue({ session_id: 10, user1_id: 1, user2_id: 2 });
    mockGetUserRole
      .mockResolvedValueOnce({ user_id: 1, role: "mentor" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" })
      .mockResolvedValueOnce({ user_id: 2, role: "user" });
    mockCountCompletedCallsForUser.mockResolvedValue(1);

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Profile service error" } }),
    });

    await InternalController.onVideoCallCompleted(req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
  });
});