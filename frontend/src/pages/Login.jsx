import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { login as loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await loginUser({ email: data.email, password: data.password });
      const { token, user } = res.data.data;
      login(token, { userId: user.user_id, email: user.email, role: user.role });
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Invalid credentials";
      toast.error(msg);
    }
  };

  return (
    <div className="center-page">
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h2 className="mb-2">Sign in</h2>
        <p className="text-muted mb-3">Welcome back to SkillBridge.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="jane@example.com"
              className={errors.email ? "input-error" : ""}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email address" },
              })}
            />
            {errors.email && <span className="error-msg">{errors.email.message}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Your password"
              className={errors.password ? "input-error" : ""}
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && <span className="error-msg">{errors.password.message}</span>}
          </div>

          <div className="row mb-3" style={{ justifyContent: "flex-end" }}>
            <Link to="/forgot-password" className="text-sm">Forgot password?</Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="spinner" /> : "Sign In"}
          </button>
        </form>

        <hr className="divider" />
        <p className="text-center text-sm">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}