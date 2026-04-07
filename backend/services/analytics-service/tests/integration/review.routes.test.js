// tests/unit/review.routes.test.js
// Note: review controller unit tests are already covered in review.controller.test.js
// This file covers route-level concerns: middleware, param parsing, method routing

import { jest } from "@jest/globals";

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

// We test the review controller functions directly here
// since routes just wire requireAuth → controller
const ReviewController = await import("../../src/controllers/review.controller.js");

describe("Review Routes - createReview (via controller)", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { videoCallId: "5" },
      user: { userId: 10 },
      body: { revieweeId: 20, rating: 4, feedbackText: "Good session" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ POST /:videoCallId/reviews - creates review with valid data", async () => {
    mockCreateReview.mockResolvedValue({
      review_id: 1,
      video_call_id: 5,
      reviewer_id: 10,
      reviewee_id: 20,
      rating: 4,
      feedback_text: "Good session",
    });

    await ReviewController.createReview(req, res, next);

    expect(mockCreateReview).toHaveBeenCalledWith({
      videoCallId: 5,
      reviewerId: 10,
      revieweeId: 20,
      rating: 4,
      feedbackText: "Good session",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ POST /:videoCallId/reviews - works with rating = 1 (min)", async () => {
    req.body = { revieweeId: 20, rating: 1 };
    mockCreateReview.mockResolvedValue({ review_id: 2, rating: 1 });

    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("✅ POST /:videoCallId/reviews - works with rating = 5 (max)", async () => {
    req.body = { revieweeId: 20, rating: 5 };
    mockCreateReview.mockResolvedValue({ review_id: 3, rating: 5 });

    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("❌ POST /:videoCallId/reviews - non-numeric videoCallId returns 400", async () => {
    req.params.videoCallId = "not-a-number";
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ POST /:videoCallId/reviews - rating below 1 returns 400", async () => {
    req.body = { revieweeId: 20, rating: 0 };
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ POST /:videoCallId/reviews - rating above 5 returns 400", async () => {
    req.body = { revieweeId: 20, rating: 6 };
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ POST /:videoCallId/reviews - self-review returns 400", async () => {
    req.body = { revieweeId: 10, rating: 5 }; // same as userId
    await ReviewController.createReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("Review Routes - getReviews (via controller)", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { videoCallId: "5" },
      user: { userId: 10 },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("✅ GET /:videoCallId/reviews - returns reviews list", async () => {
    mockListReviews.mockResolvedValue([
      { review_id: 1, rating: 4, feedback_text: "Good" },
      { review_id: 2, rating: 5, feedback_text: "Excellent" },
    ]);

    await ReviewController.getReviews(req, res, next);

    expect(mockListReviews).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviews: expect.arrayContaining([
            expect.objectContaining({ review_id: 1 }),
          ]),
        }),
      })
    );
  });

  test("✅ GET /:videoCallId/reviews - returns empty array", async () => {
    mockListReviews.mockResolvedValue([]);
    await ReviewController.getReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviews: [] }),
      })
    );
  });

  test("❌ GET /:videoCallId/reviews - non-numeric videoCallId returns 400", async () => {
    req.params.videoCallId = "invalid";
    await ReviewController.getReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("❌ GET /:videoCallId/reviews - calls next(err) on model error", async () => {
    mockListReviews.mockRejectedValue(new Error("DB error"));
    await ReviewController.getReviews(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});