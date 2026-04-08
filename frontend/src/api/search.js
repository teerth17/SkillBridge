import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SEARCH_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// GET /search/mentors
// Query params: q?, availability?, minRating?, sortBy?: "relevance"|"rating"|"experience", limit?
// Returns: { fallbackUsed: bool, count: number, results: [...] }
export const searchMentors = (params) =>
  api.get("/search/mentors", { params });

// GET /search/skills/autocomplete
// Query params: q (required), limit?
// Returns: { skills: [{ skill_id, skill_name, skill_category }] }
export const autocompleteSkills = (q, limit = 10) =>
  api.get("/search/skills/autocomplete", { params: { q, limit } });