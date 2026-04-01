import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import passwordUtils from "../utils/password.js";
import * as User from "../models/user.model.js";
import * as Reset from "../models/passwordReset.model.js";
import { pool } from "../db.js";
import crypto from "crypto";

const { hashPassword, comparePassword, generateResetToken } = passwordUtils;

// Register: only needs name/email/password. Profile fields later.
const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  // Optional: allow choosing role at signup if you want; must match check constraint
  role: z.enum(["user", "mentor"]).optional(),
});

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const { name, email, password, confirmPassword, role } = parsed.data;
    if (password !== confirmPassword) return fail(res, "Passwords do not match", 400);

    const existing = await User.findByEmail(email);
    if (existing && !existing.deleted_at) return fail(res, "Email already registered", 409);

    const passwordHash = await hashPassword(password);
    const created = await User.createUser({ email, name, passwordHash, role });

    const token = signToken({ userId: created.user_id, email: created.email, role: created.role });
    return ok(res, { user: User.toPublicUser(created), token }, 201);
  } catch (err) {
    if (err?.code === "23505") return fail(res, "Email already registered", 409);
    return next(err);
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const { email, password } = parsed.data;

    const user = await User.findByEmail(email);
    if (!user || user.deleted_at) return fail(res, "Invalid credentials", 401);

    const okPass = await comparePassword(password, user.password_hash);
    if (!okPass) return fail(res, "Invalid credentials", 401);

    await User.updateLastLogin(user.user_id);

    const token = signToken({ userId: user.user_id, email: user.email, role: user.role });
    return ok(res, { user: User.toPublicUser(user), token });
  } catch (err) {
    return next(err);
  }
}

export function validateToken(req, res) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return fail(res, "Missing token", 401);

  try {
    const decoded = verifyToken(token);
    return ok(res, { valid: true, userId: decoded.userId, email: decoded.email, role: decoded.role });
  } catch {
    return fail(res, "Invalid or expired token", 401);
  }
}

export function logout(req, res) {
  // Stateless JWT logout
  return ok(res, { message: "Logged out" });
}

const forgotSchema = z.object({ email: z.string().email() });

export async function forgotPassword(req, res, next) {
  try {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const { email } = parsed.data;

    const user = await User.findByEmail(email);
    // always return success to prevent email enumeration
    if (!user || user.deleted_at) return ok(res, { message: "Reset link sent" });

    const { raw, hash } = generateResetToken();
    const mins = Number(process.env.RESET_TOKEN_EXPIRES_MIN || 30);
    const expiresAt = new Date(Date.now() + mins * 60 * 1000);

    await Reset.createResetToken({ userId: user.user_id, tokenHash: hash, expiresAt });

    // In production, email raw. For dev, return raw as devToken.
    return ok(res, { message: "Reset link sent", devToken: raw });
  } catch (err) {
    return next(err);
  }
}

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export async function resetPassword(req, res, next) {
  try {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid input", 400, parsed.error.flatten());

    const { token, newPassword, confirmPassword } = parsed.data;
    if (newPassword !== confirmPassword) return fail(res, "Passwords do not match", 400);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const row = await Reset.findValidToken(tokenHash);
    if (!row) return fail(res, "Invalid or expired reset token", 400);

    const passwordHash = await hashPassword(newPassword);

    await pool.query("BEGIN");
    try {
      await User.updatePassword(row.user_id, passwordHash);
      await Reset.markUsed(row.reset_id);
      await pool.query("COMMIT");
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }

    return ok(res, { message: "Password reset successful" });
  } catch (err) {
    return next(err);
  }
}

