import pkg from 'jsonwebtoken';
const { sign, verify } = pkg;

export function signToken({ userId, email, role }) {
  console.log("Secret: " + process.env.JWT_SECRET);
  return sign({ userId, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export function verifyToken(token) {
  return verify(token, process.env.JWT_SECRET);
}


