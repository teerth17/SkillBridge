import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { getProfile } from "../api/profile";
import { useEffect, useState } from "react";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ChatRow({ session, onOpen }) {
  const [otherUser, setOtherUser] = useState(null);

  useEffect(() => {
    if (!session.otherUserId) return;
    getProfile(session.otherUserId)
      .then((res) => setOtherUser(res.data.data))
      .catch(() => {});
  }, [session.otherUserId]);

  const name = otherUser?.name || `User #${session.otherUserId}`;
  const initial = name.charAt(0).toUpperCase();
  const hasUnread = session.unread > 0;

  return (
    <div
      onClick={onOpen}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        background: hasUnread ? "#f0f7ff" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = hasUnread ? "#e0f0ff" : "#f9f9f9"}
      onMouseLeave={(e) => e.currentTarget.style.background = hasUnread ? "#f0f7ff" : "transparent"}
    >
      {/* Avatar */}
      <div style={{
        width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
        background: "#dbeafe", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#1d4ed8",
        position: "relative",
      }}>
        {initial}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontWeight: hasUnread ? 600 : 500, fontSize: 15 }}>{name}</span>
          <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
            {formatTime(session.lastSentAt)}
          </span>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <p style={{
            fontSize: 13, color: hasUnread ? "var(--text)" : "var(--muted)",
            margin: 0, overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap", maxWidth: "85%",
            fontWeight: hasUnread ? 500 : 400,
          }}>
            {session.lastMessage || "No messages yet"}
          </p>
          {hasUnread && (
            <span style={{
              background: "#2563eb", color: "#fff",
              borderRadius: "99px", fontSize: 11, fontWeight: 700,
              padding: "2px 7px", minWidth: 20, textAlign: "center",
              flexShrink: 0,
            }}>
              {session.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Chats() {
  const { sessionList, totalUnread, reloadSessions } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Reload on mount to get fresh data
  useEffect(() => {
    reloadSessions();
  }, [reloadSessions]);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600, padding: 0 }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Chats</h2>
            {totalUnread > 0 && (
              <p className="text-muted text-sm" style={{ margin: "2px 0 0" }}>
                {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Session list */}
        {sessionList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>💬</p>
            <p style={{ fontWeight: 500, fontSize: 16 }}>No chats yet</p>
            <p className="text-muted text-sm mt-1">
              Accept a connection and open a session to start chatting.
            </p>
          </div>
        ) : (
          <div>
            {sessionList.map((session) => (
              <ChatRow
                key={session.session_id}
                session={session}
                onOpen={() => navigate(`/session/${session.session_id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}