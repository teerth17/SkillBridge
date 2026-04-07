// tests/setup/env.js
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/skillbridge";
process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
process.env.INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "test_internal_token";
process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4000";
process.env.SESSION_SERVICE_URL = process.env.SESSION_SERVICE_URL || "http://localhost:4002";
process.env.COMMUNICATION_SERVICE_URL = process.env.COMMUNICATION_SERVICE_URL || "http://localhost:4004";
process.env.JITSI_BASE_URL = process.env.JITSI_BASE_URL || "http://localhost:8000";