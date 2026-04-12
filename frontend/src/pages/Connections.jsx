import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getMyConnections,
  respondToConnection,
  createOrGetSession,
} from "../api/session";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  pending:  { label: "Pending",  cls: "badge-amber" },
  accepted: { label: "Accepted", cls: "badge-green" },
  rejected: { label: "Rejected", cls: "badge-gray"  },
  blocked:  { label: "Blocked",  cls: "badge-gray"  },
};

function ConnectionCard({ conn, currentUserId, onRespond, onStartSession }) {
  const isRequester = conn.requester_id === currentUserId;
  const otherUserId = isRequester ? conn.receiver_id : conn.requester_id;
  const { label, cls } = STATUS_BADGE[conn.status] || { label: conn.status, cls: "badge-gray" };
  const [responding, setResponding] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleRespond = async (status) => {
    setResponding(true);
    await onRespond(conn.connection_id, status);
    setResponding(false);
  };

  const handleStart = async () => {
    setStarting(true);
    await onStartSession(conn.connection_id);
    setStarting(false);
  };

  return (
    <div className="card-sm" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: "#dbeafe", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 18, fontWeight: 600, color: "#1d4ed8",
      }}>
        {otherUserId}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link to={`/profile/${otherUserId}`} style={{ fontWeight: 500, fontSize: 14 }}>
            User #{otherUserId}
          </Link>
          <span className={`badge ${cls}`} style={{ fontSize: 11 }}>{label}</span>
          {isRequester && conn.status === "pending" && (
            <span className="text-muted" style={{ fontSize: 11 }}>Sent by you</span>
          )}
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
          {new Date(conn.requested_at).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
        {/* Receiver can accept/reject pending requests */}
        {!isRequester && conn.status === "pending" && (
          <>
            <button
              className="btn btn-primary"
              style={{ padding: "5px 12px", fontSize: 13 }}
              onClick={() => handleRespond("accepted")}
              disabled={responding}
            >
              {responding ? <span className="spinner" /> : "Accept"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "5px 12px", fontSize: 13 }}
              onClick={() => handleRespond("rejected")}
              disabled={responding}
            >
              Decline
            </button>
          </>
        )}

        {/* Either party can start session on accepted connections */}
        {conn.status === "accepted" && (
          <button
            className="btn btn-primary"
            style={{ padding: "5px 12px", fontSize: 13 }}
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? <span className="spinner" /> : "Open Session"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "accepted" | "all"

  const load = () => {
    setLoading(true);
    getMyConnections()
      .then((res) => setConnections(res.data.data.connections))
      .catch(() => toast.error("Failed to load connections"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRespond = async (connectionId, status) => {
    try {
      const res = await respondToConnection(connectionId, status);
      const updated = res.data.data.connection;
      setConnections((prev) =>
        prev.map((c) => c.connection_id === connectionId ? { ...c, ...updated } : c)
      );
      toast.success(status === "accepted" ? "Connection accepted!" : "Connection declined");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to respond");
    }
  };

  const handleStartSession = async (connectionId) => {
    try {
      const res = await createOrGetSession(connectionId);
      const session = res.data.data.session;
      navigate(`/session/${session.session_id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to start session");
    }
  };

  const filtered = connections.filter((c) => {
    if (activeTab === "pending") return c.status === "pending";
    if (activeTab === "accepted") return c.status === "accepted";
    return true;
  });

  const pendingCount = connections.filter((c) => c.status === "pending").length;

  const tabStyle = (tab) => ({
    padding: "8px 16px", fontSize: 14, cursor: "pointer", border: "none",
    borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
    background: "transparent",
    color: activeTab === tab ? "var(--accent)" : "var(--muted)",
    fontWeight: activeTab === tab ? 500 : 400,
  });

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="row mb-3" style={{ justifyContent: "space-between" }}>
          <h2>Connections</h2>
          <Link to="/search" className="btn btn-primary" style={{ padding: "8px 16px" }}>
            + Find Mentors
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex" }}>
          <button style={tabStyle("pending")} onClick={() => setActiveTab("pending")}>
            Pending {pendingCount > 0 && (
              <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: 11 }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button style={tabStyle("accepted")} onClick={() => setActiveTab("accepted")}>
            Accepted
          </button>
          <button style={tabStyle("all")} onClick={() => setActiveTab("all")}>
            All
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center" style={{ padding: 40 }}>
            <span className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center" style={{ padding: "40px 20px" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>
              {activeTab === "pending" ? "📬" : "🤝"}
            </p>
            <p style={{ fontWeight: 500 }}>
              {activeTab === "pending" ? "No pending requests" : "No connections yet"}
            </p>
            <p className="text-muted text-sm mt-1">
              {activeTab === "pending"
                ? "When someone requests a connection with you, it will appear here."
                : "Search for mentors and send a connection request to get started."}
            </p>
            <Link to="/search" className="btn btn-primary mt-2" style={{ display: "inline-flex" }}>
              Find Mentors
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((conn) => (
              <ConnectionCard
                key={conn.connection_id}
                conn={conn}
                currentUserId={user.userId}
                onRespond={handleRespond}
                onStartSession={handleStartSession}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}