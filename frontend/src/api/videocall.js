import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_VIDEO_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// POST /video-calls
// Body: { sessionId, topic?, mentorUserId? }
// Returns: { videoCallId, sessionId, mentorUserId, meetingUrl, jitsiRoomId, status, topic, startTime }
export const createVideoCall = (sessionId, mentorUserId, topic) =>
  api.post("/video-calls", {
    sessionId,
    ...(mentorUserId && { mentorUserId }),
    ...(topic && { topic }),
  });

// PATCH /video-calls/:videoCallId/start
// Returns: { videoCall: { video_call_id, status: "active", ... } }
export const startVideoCall = (videoCallId) =>
  api.patch(`/video-calls/${videoCallId}/start`);

// PATCH /video-calls/:videoCallId/end
// Returns: { videoCall: { video_call_id, status: "completed", end_time, duration_minutes } }
export const endVideoCall = (videoCallId) =>
  api.patch(`/video-calls/${videoCallId}/end`);

// GET /video-calls/sessions/:sessionId
// Returns: { videoCalls: [...] }
export const getCallsForSession = (sessionId) =>
  api.get(`/video-calls/sessions/${sessionId}`);

// POST /video-calls/:videoCallId/reviews
// Body: { revieweeId, rating: 1-5, feedbackText? }
// Returns: { review: {...} }
export const createReview = (videoCallId, revieweeId, rating, feedbackText) =>
  api.post(`/video-calls/${videoCallId}/reviews`, {
    revieweeId,
    rating,
    ...(feedbackText && { feedbackText }),
  });