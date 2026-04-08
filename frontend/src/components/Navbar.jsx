import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">SkillBridge</NavLink>

      <div className="navbar-links">
        <NavLink to="/search">Search Mentors</NavLink>
        <NavLink to="/connections">Connections</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </div>

      <div className="navbar-user">
        <NavLink to={`/profile/${user?.userId}`} className="text-sm">
          {user?.email}
        </NavLink>
        <span className={`badge ${user?.role === "mentor" ? "badge-blue" : "badge-gray"}`}>
          {user?.role}
        </span>
        <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}