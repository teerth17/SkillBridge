// tests/unit/review.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockGetVideoCallById = jest.fn();
const mockValidateUserInSession = jest.fn();
const mockCreateReview = jest.fn();
const mockListReviewsForVideoCall = jest.fn();

await jest.unstable_mockModule("../../src/models/videocall.model.js", () => ({
  getVideoCallById: mockGetVideoCallById,
  createVideoCall: jest.fn(),
  listVideoCallsForSession: jest.fn(),
  markStarted: jest.fn(),
  markEnded: jest.fn(),
}));

await jest.unstable_mockModule("../../src/models/session.model.js", () => ({
  validateUserInSession: mockValidateUserInSession,
  notifyCallCompleted: jest.fn(),
}));

await jest.unstable_mockModule("../../src/models/review.model.js", () => ({
  createReview: mockCreateReview,
  listReviewsForVideoCall: mockListReviewsForVideoCall,
}));

const ReviewController = await import("../../src/controllers/review.controller.js");

// ================================================
// createReview
// ================================================
describe("Review Controller - createReview", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { videoCallId: "1" },
      user: { userId: 1 },
      token: "fake-token",
      body: { revieweeId: 2, rating: 5, feedbackText: "Great session!" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ creates review after completed call", async () => {
    mockGetVideoCallById.mockResolvedValue({
      video_call_id: 1,
      session_id: 10,
      end_time: new Date(), // call has ended
    });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockCreateReview.mockResolvedValue({
      review_id: 1,
      video_call_id: 1,
      reviewer_id: 1,
      reviewee_id: 2,
      rating: 5,
      feedback_text: "Great session!",
      created_at: new Date().toISOString(),
    });

    await ReviewController.createReview(req, res, next);

    expect(mockCreateReview).toHaveBeenCalledWith({
      videoCallId: 1,
      reviewerId: 1,
      revieweeId: 2,
      rating: 5,
      feedbackText: "Great session!",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ creates review without optional feedbackText", async () => {
    req.body = { revieweeId: 2, rating: 4 };
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, end_time: new Date() });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockCreateReview.mockResolvedValue({ review_id: 1, rating: 4 });

    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("❌ invalid videoCallId returns 400", async () => {
    req.params.videoCallId = "abc";
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid rating (out of range) returns 400", async () => {
    req.body = { revieweeId: 2, rating: 6 }; // max is 5
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ video call not found returns 404", async () => {
    mockGetVideoCallById.mockResolvedValue(null);
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ returns 400 when call has not ended yet", async () => {
    mockGetVideoCallById.mockResolvedValue({
      video_call_id: 1,
      session_id: 10,
      end_time: null, // not ended
    });
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ returns 403 when reviewer is not a session participant", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, end_time: new Date() });
    mockValidateUserInSession.mockResolvedValue({ ok: false, error: "Invalid session" });
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("❌ returns 400 when revieweeId is not a session participant", async () => {
    req.body = { revieweeId: 99, rating: 5 }; // not in session
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, end_time: new Date() });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ cannot review yourself returns 400", async () => {
    req.body = { revieweeId: 1, rating: 5 }; // reviewing self (userId=1)
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, end_time: new Date() });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ================================================
// listReviews
// ================================================
describe("Review Controller - listReviews", () => {
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

  test("✅ returns reviews for a video call", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, end_time: new Date() });
    mockValidateUserInSession.mockResolvedValue({
      ok: true,
      session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockListReviewsForVideoCall.mockResolvedValue([
      { review_id: 1, rating: 5, feedback_text: "Excellent!" },
    ]);

    await ReviewController.listReviews(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reviews: expect.any(Array) }) })
    );
  });

  test("✅ returns empty array when no reviews", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10, end_time: new Date() });
    mockValidateUserInSession.mockResolvedValue({
      ok: true, session: { session_id: 10, user1_id: 1, user2_id: 2 },
    });
    mockListReviewsForVideoCall.mockResolvedValue([]);

    await ReviewController.listReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid videoCallId returns 400", async () => {
    req.params.videoCallId = "xyz";
    await ReviewController.listReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ video call not found returns 404", async () => {
    mockGetVideoCallById.mockResolvedValue(null);
    await ReviewController.listReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("❌ returns 403 when not a session participant", async () => {
    mockGetVideoCallById.mockResolvedValue({ video_call_id: 1, session_id: 10 });
    mockValidateUserInSession.mockResolvedValue({ ok: false, error: "Invalid session" });
    await ReviewController.listReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});