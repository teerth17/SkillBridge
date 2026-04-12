import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getDashboard,
  getUserStats,
  getMentorStats,
  getTopMentors,
  getTopSkills,
} from "../api/analytics";
import toast from "react-hot-toast";

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--color-background-secondary, #f9f8f4)",
      borderRadius: "var(--border-radius-md, 8px)",
      padding: "16px", textAlign: "center",
    }}>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card mb-3">
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isMentor = user?.role === "mentor";

  const [dashboard, setDashboard] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [mentorStats, setMentorStats] = useState(null);
  const [topMentors, setTopMentors] = useState([]);
  const [topSkills, setTopSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calls = [
      getDashboard(),
      getUserStats(user.userId),
      getTopMentors(5),
      getTopSkills(5),
    ];

    // Add mentor stats only if mentor
    if (isMentor) calls.push(getMentorStats(user.userId));

    Promise.all(calls)
      .then(([dashRes, userRes, topMRes, topSRes, mentorRes]) => {
        setDashboard(dashRes.data.data);
        setUserStats(userRes.data.data);
        setTopMentors(topMRes.data.data);
        setTopSkills(topSRes.data.data);
        if (mentorRes) setMentorStats(mentorRes.data.data);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [user.userId, isMentor]);

  if (loading) {
    return (
      <div className="center-page">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="row mb-3" style={{ justifyContent: "space-between" }}>
          <h2>Dashboard</h2>
          <span className={`badge ${isMentor ? "badge-blue" : "badge-gray"}`} style={{ fontSize: 13, padding: "4px 12px" }}>
            {isMentor ? "Mentor" : "User"}
          </span>
        </div>

        {/* Overview stats */}
        <Section title="Overview">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <StatCard
              label="Sessions Attended"
              value={userStats?.sessionsAttended ?? 0}
            />
            <StatCard
              label="Total Hours"
              value={`${userStats?.totalHours ?? 0}h`}
              sub={`${userStats?.totalMinutes ?? 0} minutes`}
            />
            <StatCard
              label="Avg Rating Received"
              value={dashboard?.avgRating ? Number(dashboard.avgRating).toFixed(1) : "—"}
              sub={`${dashboard?.totalReviews ?? 0} reviews`}
            />
          </div>
        </Section>

        {/* Skills practiced */}
        {userStats?.skillsPracticed?.length > 0 && (
          <Section title="Skills Practiced">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {userStats.skillsPracticed.map((skill) => (
                <span key={skill} className="badge badge-blue" style={{ fontSize: 13, padding: "4px 12px" }}>
                  {skill}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Mentor stats — only if mentor */}
        {isMentor && mentorStats && (
          <Section title="Mentor Stats">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Sessions Hosted" value={mentorStats.sessionsHosted ?? 0} />
              <StatCard label="Total Mentees" value={mentorStats.totalMentees ?? 0} />
              <StatCard
                label="Avg Rating"
                value={mentorStats.avgRating ? Number(mentorStats.avgRating).toFixed(1) : "—"}
                sub={`${mentorStats.totalReviews ?? 0} reviews`}
              />
              <StatCard
                label="Hours Mentored"
                value={`${mentorStats.totalHours ?? 0}h`}
              />
            </div>

            {/* Skill popularity */}
            {mentorStats.skillPopularity?.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Skill Popularity</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mentorStats.skillPopularity.map((s) => (
                    <div key={s.skill_name} className="row" style={{ justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14 }}>{s.skill_name}</span>
                      <span className="badge badge-gray" style={{ fontSize: 12 }}>
                        {s.mentee_count} mentee{s.mentee_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>
        )}

        {/* Top Mentors */}
        {topMentors?.length > 0 && (
          <Section title="Top Mentors">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topMentors.map((m, i) => (
                <div key={m.user_id} className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", minWidth: 20 }}>#{i + 1}</span>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "#dbeafe", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#1d4ed8",
                    }}>
                      {m.name?.charAt(0).toUpperCase()}
                    </div>
                    <Link to={`/profile/${m.user_id}`} style={{ fontWeight: 500, fontSize: 14 }}>
                      {m.name}
                    </Link>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ color: "#f59e0b", fontSize: 13 }}>★ {Number(m.avg_rating).toFixed(1)}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {m.completed_calls} session{m.completed_calls !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Top Skills */}
        {topSkills?.length > 0 && (
          <Section title="Trending Skills">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topSkills.map((s, i) => {
                const max = topSkills[0]?.user_count || 1;
                const pct = Math.round((s.user_count / max) * 100);
                return (
                  <div key={s.skill_name}>
                    <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>
                        <span style={{ color: "var(--muted)", marginRight: 8, fontSize: 12 }}>#{i + 1}</span>
                        {s.skill_name}
                      </span>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {s.user_count} user{s.user_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4 }}>
                      <div style={{
                        height: 4, borderRadius: 4,
                        width: `${pct}%`, background: "var(--accent)",
                        transition: "width 0.3s",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* No activity state */}
        {userStats?.sessionsAttended === 0 && !isMentor && (
          <div className="card text-center" style={{ padding: "32px 20px" }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>📊</p>
            <p style={{ fontWeight: 500 }}>No activity yet</p>
            <p className="text-muted text-sm mt-1 mb-2">
              Find a mentor and start a session to see your stats here.
            </p>
            <Link to="/search" className="btn btn-primary" style={{ display: "inline-flex" }}>
              Find a Mentor
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}