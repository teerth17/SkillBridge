import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getProfile,
  updateProfile,
  addSkill,
  removeSkill,
  getAllSkills,
} from "../api/profile";

const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function EditProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [skillCatalog, setSkillCatalog] = useState([]);  // [{ skill_id, skill_name, category }]
  const [userSkills, setUserSkills] = useState([]);       // [{ skill_id, skill_name, proficiency_level, years_experience }]
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);

  // Skill add form state
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedProficiency, setSelectedProficiency] = useState("Beginner");
  const [selectedYears, setSelectedYears] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Redirect if not own profile
  useEffect(() => {
    if (user && user.userId !== Number(userId)) {
      toast.error("You can only edit your own profile");
      navigate(`/profile/${userId}`);
    }
  }, [user, userId, navigate]);

  // Load profile + skill catalog
  useEffect(() => {
    Promise.all([getProfile(userId), getAllSkills()])
      .then(([profileRes, skillsRes]) => {
        const p = profileRes.data.data;
        setProfile(p);
        setUserSkills(p.skills || []);
        setSkillCatalog(skillsRes.data.data.skills || []);
        // Pre-fill form
        reset({
          name: p.name || "",
          bio: p.bio || "",
          experience: p.experience || "",
          availability: p.availability || "",
        });
      })
      .catch((err) => {
        const msg = err.response?.data?.error?.message || "Failed to load profile";
        toast.error(msg);
        navigate("/");
      })
      .finally(() => setLoading(false));
  }, [userId, navigate, reset]);

  // Save profile info
  const onSubmitProfile = async (data) => {
    setSavingProfile(true);
    try {
      const res = await updateProfile(Number(userId), {
        name: data.name,
        bio: data.bio,
        experience: data.experience,
        availability: data.availability,
      });
      setProfile(res.data.data.profile);
      toast.success("Profile updated!");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Update failed";
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // Add a skill
  const handleAddSkill = async () => {
    if (!selectedSkillId) {
      toast.error("Please select a skill");
      return;
    }
    // Check if already added
    if (userSkills.find((s) => s.skill_id === Number(selectedSkillId))) {
      toast.error("Skill already added");
      return;
    }
    setAddingSkill(true);
    try {
      const payload = {
        skillId: Number(selectedSkillId),
        proficiencyLevel: selectedProficiency || undefined,
        yearsExperience: selectedYears ? Number(selectedYears) : undefined,
      };
      const res = await addSkill(Number(userId), payload);
      // Merge added skill with catalog name for display
      const catalog = skillCatalog.find((s) => s.skill_id === Number(selectedSkillId));
      const newSkill = {
        skill_id: res.data.data.userSkill.skill_id,
        skill_name: catalog?.skill_name || "",
        proficiency_level: res.data.data.userSkill.proficiency_level,
        years_experience: res.data.data.userSkill.years_experience,
      };
      setUserSkills((prev) => [...prev, newSkill]);
      // Reset add form
      setSelectedSkillId("");
      setSelectedProficiency("Beginner");
      setSelectedYears("");
      toast.success("Skill added!");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to add skill";
      toast.error(msg);
    } finally {
      setAddingSkill(false);
    }
  };

  // Remove a skill
  const handleRemoveSkill = async (skillId) => {
    try {
      await removeSkill(Number(userId), skillId);
      setUserSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
      toast.success("Skill removed");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to remove skill";
      toast.error(msg);
    }
  };

  // Skills not yet added by user (for dropdown)
  const availableSkills = skillCatalog.filter(
    (s) => !userSkills.find((us) => us.skill_id === s.skill_id)
  );

  if (loading) {
    return (
      <div className="center-page">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div className="row mb-3" style={{ justifyContent: "space-between" }}>
          <h2>Edit Profile</h2>
          <Link to={`/profile/${userId}`} className="btn btn-ghost" style={{ padding: "6px 14px" }}>
            View Profile
          </Link>
        </div>

        {/* Profile info form */}
        <div className="card mb-3">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Profile Information</h3>
          <form onSubmit={handleSubmit(onSubmitProfile)} noValidate>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className={errors.name ? "input-error" : ""}
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && <span className="error-msg">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                rows={3}
                placeholder="Tell mentors and mentees about yourself..."
                {...register("bio")}
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="form-group">
              <label>Experience</label>
              <textarea
                rows={2}
                placeholder="e.g. 3 years as a software engineer at..."
                {...register("experience")}
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="form-group">
              <label>Availability</label>
              <input
                type="text"
                placeholder="e.g. Weekends, evenings after 6pm"
                {...register("availability")}
              />
              <span className="field-hint">Let others know when you're available for sessions</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingProfile}
            >
              {savingProfile ? <span className="spinner" /> : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Skills section */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Skills</h3>

          {/* Current skills */}
          {userSkills.length === 0 ? (
            <p className="text-muted text-sm mb-3">No skills added yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {userSkills.map((s) => (
                <div
                  key={s.skill_id}
                  className="row"
                  style={{
                    justifyContent: "space-between", background: "#f9fafb",
                    border: "1px solid #e4e4e4", borderRadius: 8, padding: "8px 12px",
                  }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{s.skill_name}</span>
                    {s.proficiency_level && (
                      <span className="badge badge-blue" style={{ fontSize: 11 }}>
                        {s.proficiency_level}
                      </span>
                    )}
                    {s.years_experience && (
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {s.years_experience} yr
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => handleRemoveSkill(s.skill_id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add skill form */}
          <hr className="divider" />
          <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Add a Skill</h4>

          {availableSkills.length === 0 ? (
            <p className="text-muted text-sm">You've added all available skills.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10 }}>
                {/* Skill dropdown */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Skill</label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                  >
                    <option value="">Select a skill...</option>
                    {availableSkills.map((s) => (
                      <option key={s.skill_id} value={s.skill_id}>
                        {s.skill_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proficiency */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Proficiency</label>
                  <select
                    value={selectedProficiency}
                    onChange={(e) => setSelectedProficiency(e.target.value)}
                  >
                    {PROFICIENCY_LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Years experience */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Years</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={selectedYears}
                    onChange={(e) => setSelectedYears(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ alignSelf: "flex-start" }}
                onClick={handleAddSkill}
                disabled={addingSkill}
              >
                {addingSkill ? <span className="spinner" /> : "+ Add Skill"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}