import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProfile } from "../api/profile";
import { createConnection } from "../api/session";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { getMyConnections, createOrGetSession } from "../api/session";

const PROFICIENCY_COLORS = {
  Beginner: "badge-gray",
  Intermediate: "badge-blue",
  Advanced: "badge-amber",
  Expert: "badge-green",
};

const BADGE_COLORS = {
  New: "badge-gray",
  Trusted: "badge-blue",
  Top: "badge-amber",
};

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);  // ← moved here
  const [connectionId, setConnectionId] = useState(null); 

  const isOwnProfile = user?.userId === Number(userId);

  
    const handleRequestMentorship = async () => {
  setRequesting(true);
  try {
    await createConnection(Number(userId));
    toast.success("Mentorship request sent!");
    navigate("/connections");
  } catch (err) {
    const msg = err.response?.data?.error?.message || "Failed to send request";
    toast.error(msg);
  } finally {
    setRequesting(false);
  }
};

  useEffect(() => {
    setLoading(true);
    getProfile(userId)
      .then((res) => setProfile(res.data.data))
      .catch((err) => {
        const msg = err.response?.data?.error?.message || "Failed to load profile";
        toast.error(msg);
        navigate("/");
      })
      .finally(() => setLoading(false));
  }, [userId, navigate]);


  useEffect(() => {
  if (!userId || isOwnProfile) return;
  getMyConnections()
    .then((res) => {
      const connections = res.data.data.connections || [];
      const conn = connections.find(
        (c) =>
          (c.requester_id === user.userId && c.receiver_id === Number(userId)) ||
          (c.receiver_id === user.userId && c.requester_id === Number(userId))
      );
      if (conn) {
        setConnectionStatus(conn.status);
        setConnectionId(conn.connection_id);
      }
    })
    .catch(() => {});
}, [userId, isOwnProfile, user.userId]);

  if (loading) {
    return (
      <div className="center-page">
        <span className="spinner" />
      </div>
    );
  }

  if (!profile) return null;

  

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>

        {/* Header card */}
        <div className="card mb-3">
          <div className="row" style={{ alignItems: "flex-start", gap: 20 }}>

            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#dbeafe", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, fontWeight: 600,
              color: "#1d4ed8", flexShrink: 0,
            }}>
              {profile.name?.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{profile.name}</h2>
                  <p className="text-muted text-sm mt-1">{profile.email}</p>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className={`badge ${profile.role === "mentor" ? "badge-blue" : "badge-gray"}`}>
                    {profile.role}
                  </span>
                  {isOwnProfile && (
                    <Link to={`/profile/${userId}/edit`} className="btn btn-ghost" style={{ padding: "6px 14px" }}>
                      Edit Profile
                    </Link>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>
              )}

              <div className="row mt-2" style={{ gap: 20, flexWrap: "wrap" }}>
                {profile.availability && (
                  <span className="text-sm">
                    <span className="text-muted">Availability: </span>{profile.availability}
                  </span>
                )}
                {profile.experience && (
                  <span className="text-sm">
                    <span className="text-muted">Experience: </span>{profile.experience}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges?.length > 0 && (
          <div className="card mb-3">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Badges</h3>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {profile.badges.map((b) => (
                <span
                  key={b.badge_id}
                  className={`badge ${BADGE_COLORS[b.badge_type] || "badge-gray"}`}
                  style={{ fontSize: 13, padding: "4px 12px" }}
                >
                  {b.badge_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        <div className="card mb-3">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Skills</h3>
          {profile.skills?.length === 0 ? (
            <p className="text-muted text-sm">
              {isOwnProfile ? "You haven't added any skills yet." : "No skills listed."}
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.skills.map((s) => (
                <div
                  key={s.skill_id}
                  style={{
                    background: "#f9fafb", border: "1px solid #e4e4e4",
                    borderRadius: 8, padding: "6px 12px", fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{s.skill_name}</span>
                  {s.proficiency_level && (
                    <span
                      className={`badge ${PROFICIENCY_COLORS[s.proficiency_level] || "badge-gray"}`}
                      style={{ marginLeft: 8, fontSize: 11 }}
                    >
                      {s.proficiency_level}
                    </span>
                  )}
                  {s.years_experience && (
                    <span className="text-muted" style={{ marginLeft: 6, fontSize: 11 }}>
                      {s.years_experience}yr
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOwnProfile && (
            <div className="mt-2">
              <Link to={`/profile/${userId}/edit`} className="text-sm" style={{ color: "var(--accent)" }}>
                + Manage skills
              </Link>
            </div>
          )}
        </div>

        {/* Actions — only shown on other people's profiles */}
        {!isOwnProfile && (
  <div className="card">
    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Connect</h3>

    {connectionStatus === null && (
      <>
        <p className="text-muted text-sm mb-2">
          Send a mentorship request to {profile.name}.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleRequestMentorship}
          disabled={requesting}
        >
          {requesting ? <span className="spinner" /> : "Request Mentorship"}
        </button>
      </>
    )}

    {connectionStatus === "pending" && (
      <p className="text-muted text-sm">
        ⏳ Connection request pending — waiting for {profile.name} to respond.
      </p>
    )}

    {connectionStatus === "accepted" && (
      <>
        <p className="text-muted text-sm mb-2">
          ✅ You are connected with {profile.name}.
        </p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            try {
              const res = await createOrGetSession(connectionId);
              const session = res.data.data.session;
              navigate(`/session/${session.session_id}`);
            } catch (err) {
              toast.error(err.response?.data?.error?.message || "Failed to open session");
            }
          }}
        >
          Open Session
        </button>
      </>
    )}

    {connectionStatus === "rejected" && (
      <p className="text-muted text-sm">
        ❌ Your previous connection request was declined.
      </p>
    )}
  </div>
)}

      </div>
    </div>
  );
}