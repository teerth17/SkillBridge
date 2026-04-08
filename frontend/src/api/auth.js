import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_AUTH_URL,
});

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data) =>
  api.post("/auth/register", data);

export const login = (data) =>
  api.post("/auth/login", data);

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (token, newPassword, confirmPassword) =>
  api.post("/auth/reset-password", { token, newPassword, confirmPassword });

export const validateToken = () =>
  api.get("/auth/validate-token");