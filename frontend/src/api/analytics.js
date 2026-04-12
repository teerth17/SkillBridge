import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// GET /analytics/dashboard
// Returns: { completedCalls, totalReviews, avgRating, skills: [{ skill_name }] }
export const getDashboard = () =>
  api.get("/analytics/dashboard");

// GET /analytics/users/:userId/stats
// Returns: { sessionsAttended, totalHours, totalMinutes, skillsPracticed: string[], skills: [] }
export const getUserStats = (userId) =>
  api.get(`/analytics/users/${userId}/stats`);

// GET /analytics/mentors/:mentorId/stats
// Returns: { sessionsHosted, totalMentees, avgRating, totalReviews, totalHours, totalMinutes, skillPopularity }
export const getMentorStats = (mentorId) =>
  api.get(`/analytics/mentors/${mentorId}/stats`);

// GET /analytics/platform
// Returns: { total_users, total_mentors, total_calls, completed_calls }
export const getPlatformStats = () =>
  api.get("/analytics/platform");

// GET /analytics/top-mentors?limit=5
// Returns: array of { user_id, name, avg_rating, completed_calls }
export const getTopMentors = (limit = 5) =>
  api.get("/analytics/top-mentors", { params: { limit } });

// GET /analytics/top-skills?limit=5
// Returns: array of { skill_name, user_count }
export const getTopSkills = (limit = 5) =>
  api.get("/analytics/top-skills", { params: { limit } });