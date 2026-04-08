import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
    const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting},
  } = useForm();

 const onSubmit = async (data) => {
  try {
    const res = await forgotPassword(data.email);
    console.log("Full response:", res.data);
    const devToken = res.data.data?.devToken;
    console.log("devToken:", devToken);
    console.log("type:", typeof devToken);
    if (devToken) {
      console.log("Navigating to:", `/reset-password?token=${devToken}`);
      navigate(`/reset-password?token=${devToken}`);
      return;
    }
    toast.success("Reset link sent — check your email");
  } catch (err) {
    console.log("Error caught:", err);
    const msg = err.response?.data?.error?.message || "Something went wrong";
    toast.error(msg);
  }
};

//   if (isSubmitSuccessful) {
//     return (
//       <div className="center-page">
//         <div className="card text-center" style={{ width: "100%", maxWidth: 420 }}>
//           <h2 className="mb-2">Check your email</h2>
//           <p className="text-muted mb-3">
//             We sent a password reset link to your email address.
//           </p>
//           <Link to="/login" className="btn btn-ghost">Back to Sign In</Link>
//         </div>
//       </div>
//     );
//   }

  return (
    <div className="center-page">
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h2 className="mb-2">Forgot password?</h2>
        <p className="text-muted mb-3">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
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

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="spinner" /> : "Send Reset Link"}
          </button>
        </form>

        <hr className="divider" />
        <p className="text-center text-sm">
          Remember it? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}