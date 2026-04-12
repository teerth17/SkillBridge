import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import { getMySessions } from "../api/session";
import { getMessages, markRead } from "../api/communication";
import { useLocation } from "react-router-dom";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const socket = useSocket();
  const location = useLocation();

  // { sessionId: { unread: number, lastMessage: string, lastSentAt: string, otherUserId: number } }
  const [sessions, setSessions] = useState({});
  const activeSessionIdRef = useRef(null);

  // Detect which session page user is currently on
  useEffect(() => {
    const match = location.pathname.match(/^\/session\/(\d+)/);
    activeSessionIdRef.current = match ? Number(match[1]) : null;
  }, [location.pathname]);

  // Load all sessions + count unread messages for each
  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getMySessions();
      const mySessionsList = res.data.data.sessions || [];

      const sessionMap = {};

      await Promise.all(
        mySessionsList.map(async (s) => {
          try {
            const msgRes = await getMessages(s.session_id, { limit: 50 });
            const messages = (msgRes.data.data.messages || []).reverse();
            const unread = messages.filter(
              (m) => m.sender_id !== user.userId && !m.is_read
            ).length;
            const lastMsg = messages[messages.length - 1];
            const otherUserId = s.user1_id === user.userId ? s.user2_id : s.user1_id;

            sessionMap[s.session_id] = {
              session_id: s.session_id,
              otherUserId,
              unread,
              lastMessage: lastMsg?.message_text || "",
              lastSentAt: lastMsg?.sent_at || s.created_at,
              session_status: s.session_status,
            };
          } catch {
            // Skip sessions we can't read
          }
        })
      );

      setSessions(sessionMap);

      // Join all session rooms via global socket
      if (socket) {
        mySessionsList.forEach((s) => {
          socket.emit("join_session", { sessionId: s.session_id });
        });
      }
    } catch {
      // Silently fail — not critical
    }
  }, [user, socket]);

  // Load on mount and when socket connects
  useEffect(() => {
    if (user && socket) loadSessions();
  }, [user, socket, loadSessions]);

  // Listen for new messages globally
  useEffect(() => {
    if (!socket || !user) return;

    const handleMessage = (msg) => {
      const sid = msg.session_id || msg.sessionId;
      if (!sid) return;

      // If user is currently viewing this session, don't increment unread
      const isCurrentSession = activeSessionIdRef.current === Number(sid);

      setSessions((prev) => {
        const existing = prev[sid] || {};
        return {
          ...prev,
          [sid]: {
            ...existing,
            session_id: sid,
            unread: isCurrentSession
              ? 0
              : (existing.unread || 0) + (msg.sender_id !== user.userId ? 1 : 0),
            lastMessage: msg.message_text || msg.messageText || existing.lastMessage,
            lastSentAt: msg.sent_at || msg.sentAt || existing.lastSentAt,
          },
        };
      });
    };

    socket.on("message_received", handleMessage);
    return () => socket.off("message_received", handleMessage);
  }, [socket, user]);

  // Mark session as read and reset unread count
  const markSessionRead = useCallback(async (sessionId) => {
    setSessions((prev) => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || {}), unread: 0 },
    }));
    try {
      await markRead(sessionId);
    } catch {
      // Silently fail
    }
  }, []);

  // Total unread across all sessions
  const totalUnread = Object.values(sessions).reduce(
    (sum, s) => sum + (s.unread || 0), 0
  );

  // Sessions sorted by last message time (newest first)
  const sessionList = Object.values(sessions).sort(
    (a, b) => new Date(b.lastSentAt || 0) - new Date(a.lastSentAt || 0)
  );

  return (
    <NotificationContext.Provider value={{
      sessions,
      sessionList,
      totalUnread,
      markSessionRead,
      reloadSessions: loadSessions,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}