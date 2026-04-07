// tests/setup/env.js
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/skillbridge";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4000";