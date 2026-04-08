import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { register as registerUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      const { token, user } = res.data.data;
      login(token, { userId: user.user_id, email: user.email, role: user.role });
      toast.success("Account created!");
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Registration failed";
      toast.error(msg);
    }
  };

  return (
    <div className="center-page">
      <div className="card" style={{ width: "100%", maxWidth: 440 }}>
        <h2 className="mb-2">Create your account</h2>
        <p className="text-muted mb-3">Start your mentorship journey today.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Name */}
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              className={errors.name ? "input-error" : ""}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <span className="error-msg">{errors.name.message}</span>}
          </div>

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
              placeholder="Min. 8 characters"
              className={errors.password ? "input-error" : ""}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
            />
            {errors.password && <span className="error-msg">{errors.password.message}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              className={errors.confirmPassword ? "input-error" : ""}
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (val) =>
                  val === watch("password") || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && (
              <span className="error-msg">{errors.confirmPassword.message}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>

        <hr className="divider" />
        <p className="text-center text-sm">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}