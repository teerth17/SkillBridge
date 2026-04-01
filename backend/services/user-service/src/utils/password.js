import { hash as _hash, compare } from "bcryptjs";
import { randomBytes, createHash } from "crypto";

async function hashPassword(password) {
  return _hash(password, 12);
}

async function comparePassword(password, hash) {
  return compare(password, hash);
}

function generateResetToken() {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export default { hashPassword, comparePassword, generateResetToken };
