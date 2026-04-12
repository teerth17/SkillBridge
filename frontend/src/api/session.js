import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SESSION_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Connections ──────────────────────────────────────────────

// GET /connections/me
// Returns: { connections: [{ connection_id, requester_id, receiver_id, status, requested_at, responded_at, expires_at }] }
export const getMyConnections = () =>
  api.get("/connections/me");

// POST /connections
// Body: { receiverId: number }
// Returns: { connection: {...} }
export const createConnection = (receiverId) =>
  api.post("/connections", { receiverId });

// PATCH /connections/:connectionId/status
// Body: { status: "accepted" | "rejected" | "blocked" }
// Returns: { connection: {...} }
export const respondToConnection = (connectionId, status) =>
  api.patch(`/connections/${connectionId}/status`, { status });

// ── Sessions ─────────────────────────────────────────────────

// GET /sessions/me
// Returns: { sessions: [{ session_id, user1_id, user2_id, session_status, connection_id }] }
export const getMySessions = () =>
  api.get("/sessions/me");

// GET /sessions/:sessionId
// Returns: { session: { session_id, user1_id, user2_id, session_status, connection_id } }
export const getSession = (sessionId) =>
  api.get(`/sessions/${sessionId}`);

// POST /sessions
// Body: { connectionId: number, skillId?: number }
// Returns: { session: {...} }
export const createOrGetSession = (connectionId, skillId) =>
  api.post("/sessions", { connectionId, ...(skillId && { skillId }) });