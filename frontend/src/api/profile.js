import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_PROFILE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// GET /profiles/:userId
// Returns: { userId, email, name, bio, profilePicture, role, experience, availability, skills[], badges[] }
export const getProfile = (userId) =>
  api.get(`/profiles/${userId}`);

// PUT /profiles/:userId
// Body: { name?, bio?, experience?, availability?, profilePicture? }
// Returns: { profile: {...}, message: "Updated" }
export const updateProfile = (userId, data) =>
  api.put(`/profiles/${userId}`, data);

// GET /profiles/:userId/badges
// Returns: { badges: [] }
export const getUserBadges = (userId) =>
  api.get(`/profiles/${userId}/badges`);

// POST /profiles/:userId/skills
// Body: { skillId: number, proficiencyLevel?: "Beginner"|"Intermediate"|"Advanced"|"Expert", yearsExperience?: number }
// Returns: { userSkill: { user_id, skill_id, proficiency_level, years_experience, created_at } }
export const addSkill = (userId, data) =>
  api.post(`/profiles/${userId}/skills`, data);

// DELETE /profiles/:userId/skills/:skillId
// Returns: { message: "Skill removed" }
export const removeSkill = (userId, skillId) =>
  api.delete(`/profiles/${userId}/skills/${skillId}`);

// GET /profiles/skills  — skill catalog (all available skills)
// Returns: { skills: [{ skill_id, skill_name, category }] }
export const getAllSkills = () =>
  api.get(`/profiles/skills`);