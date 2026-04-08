import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  if (!token) {
    return (
      <div className="center-page">
        <div className="card text-center" style={{ width: "100%", maxWidth: 420 }}>
          <h2 className="mb-2">Invalid link</h2>
          <p className="text-muted mb-3">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn btn-primary">Request new link</Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data) => {
    try {
      await resetPassword(token, data.newPassword, data.confirmPassword);
      toast.success("Password updated — please sign in");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Reset failed";
      toast.error(msg);
    }
  };

  return (
    <div className="center-page">
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h2 className="mb-2">Set new password</h2>
        <p className="text-muted mb-3">Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
  <label>New Password</label>
  <input
    type="password"
    placeholder="Min. 8 characters"
    className={errors.newPassword ? "input-error" : ""}
    {...register("newPassword", {
      required: "Password is required",
      minLength: { value: 8, message: "Password must be at least 8 characters" },
    })}
  />
  {errors.newPassword && <span className="error-msg">{errors.newPassword.message}</span>}
</div>

<div className="form-group">
  <label>Confirm New Password</label>
  <input
    type="password"
    placeholder="Repeat your password"
    className={errors.confirmPassword ? "input-error" : ""}
    {...register("confirmPassword", {
      required: "Please confirm your password",
      validate: (val) => val === watch("newPassword") || "Passwords do not match",
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
            {isSubmitting ? <span className="spinner" /> : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}