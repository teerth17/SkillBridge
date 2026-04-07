// tests/unit/review.controller.test.js
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------
const mockCreateReview = jest.fn();
const mockListReviews = jest.fn();

await jest.unstable_mockModule("../../src/models/analytics.model.js", () => ({
  getUserDashboard: jest.fn(),
  getUserStats: jest.fn(),
  getMentorStats: jest.fn(),
  getBadgeEligibility: jest.fn(),
  getPlatformStats: jest.fn(),
  getTopMentors: jest.fn(),
  getTopSkills: jest.fn(),
  createReview: mockCreateReview,
  listReviews: mockListReviews,
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
      body: { revieweeId: 2, rating: 5, feedbackText: "Great!" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ creates a review successfully", async () => {
    mockCreateReview.mockResolvedValue({
      review_id: 1,
      video_call_id: 1,
      reviewer_id: 1,
      reviewee_id: 2,
      rating: 5,
      feedback_text: "Great!",
    });

    await ReviewController.createReview(req, res, next);

    expect(mockCreateReview).toHaveBeenCalledWith({
      videoCallId: 1,
      reviewerId: 1,
      revieweeId: 2,
      rating: 5,
      feedbackText: "Great!",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ creates review without optional feedbackText", async () => {
    req.body = { revieweeId: 2, rating: 4 };
    mockCreateReview.mockResolvedValue({ review_id: 1, rating: 4 });

    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("❌ cannot review yourself returns 400", async () => {
    req.body = { revieweeId: 1, rating: 5 }; // reviewer === reviewee
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid rating (too high) returns 400", async () => {
    req.body = { revieweeId: 2, rating: 6 };
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid rating (zero) returns 400", async () => {
    req.body = { revieweeId: 2, rating: 0 };
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ missing revieweeId returns 400", async () => {
    req.body = { rating: 5 };
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ missing rating returns 400", async () => {
    req.body = { revieweeId: 2 };
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ invalid videoCallId returns 400", async () => {
    req.params.videoCallId = "abc";
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ calls next(err) on model error", async () => {
    mockCreateReview.mockRejectedValue(new Error("DB error"));
    await ReviewController.createReview(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ================================================
// getReviews
// ================================================
describe("Review Controller - getReviews", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: { videoCallId: "1" }, user: { userId: 1 } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ returns reviews for a video call", async () => {
    mockListReviews.mockResolvedValue([
      { review_id: 1, rating: 5, feedback_text: "Excellent!" },
    ]);

    await ReviewController.getReviews(req, res, next);

    expect(mockListReviews).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviews: expect.any(Array) }),
      })
    );
  });

  test("✅ returns empty array when no reviews", async () => {
    mockListReviews.mockResolvedValue([]);
    await ReviewController.getReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("❌ invalid videoCallId returns 400", async () => {
    req.params.videoCallId = "abc";
    await ReviewController.getReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ calls next(err) on model error", async () => {
    mockListReviews.mockRejectedValue(new Error("DB error"));
    await ReviewController.getReviews(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});