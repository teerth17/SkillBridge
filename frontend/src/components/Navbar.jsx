import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalUnread } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const navLinkStyle = (path) => ({
    fontSize: 14,
    fontWeight: isActive(path) ? 600 : 400,
    color: isActive(path) ? "var(--accent)" : "var(--text)",
    textDecoration: "none",
    padding: "4px 0",
    borderBottom: isActive(path) ? "2px solid var(--accent)" : "2px solid transparent",
  });

  return (
    <nav style={{
      height: 56, borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      padding: "0 24px",
      justifyContent: "space-between",
      background: "var(--color-background, #fff)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <Link to="/" style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", textDecoration: "none" }}>
        SkillBridge
      </Link>

      {/* Nav links */}
      {user && (
        <div className="row" style={{ gap: 24 }}>
          <Link to="/search" style={navLinkStyle("/search")}>
            Search Mentors
          </Link>

          {/* Chats with unread badge */}
          <Link to="/chats" style={{ ...navLinkStyle("/chats"), position: "relative" }}>
            Chats
            {totalUnread > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -14,
                background: "#ef4444", color: "#fff",
                borderRadius: "99px", fontSize: 10, fontWeight: 700,
                padding: "1px 5px", minWidth: 16, textAlign: "center",
                lineHeight: "16px",
              }}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>

          <Link to="/connections" style={navLinkStyle("/connections")}>
            Connections
          </Link>

          <Link to="/dashboard" style={navLinkStyle("/dashboard")}>
            Dashboard
          </Link>
        </div>
      )}

      {/* User info + logout */}
      {user && (
        <div className="row" style={{ gap: 12 }}>
          <Link
            to={`/profile/${user.userId}`}
            style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}
          >
            {user.email}
          </Link>
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ padding: "4px 12px", fontSize: 13 }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}