import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_COMM_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// GET /communication/sessions/:sessionId/messages
// Query: ?limit=50&before=<timestamp>
// Returns: { messages: [{ message_id, session_id, sender_id, message_text, message_type, is_read, sent_at }] }
export const getMessages = (sessionId, params = {}) =>
  api.get(`/communication/sessions/${sessionId}/messages`, { params });

// POST /communication/sessions/:sessionId/messages
// Body: { text: string, messageType?: "text" | "system" }
// Returns: { message: { message_id, session_id, sender_id, message_text, message_type, sent_at } }
export const postMessage = (sessionId, text, messageType = "text") =>
  api.post(`/communication/sessions/${sessionId}/messages`, { text, messageType });

// PATCH /communication/sessions/:sessionId/read
export const markRead = (sessionId) =>
  api.patch(`/communication/sessions/${sessionId}/read`);