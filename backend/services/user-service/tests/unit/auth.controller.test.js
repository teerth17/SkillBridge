import "dotenv/config";
import { jest } from "@jest/globals";

// ---------------- MOCKS ----------------

// user model mocks
const mockFindByEmail = jest.fn();
const mockCreateUser = jest.fn();
const mockToPublicUser = jest.fn();
const mockUpdateLastLogin = jest.fn();

// password mocks
const mockHashPassword = jest.fn();
const mockComparePassword = jest.fn();

// jwt mocks
const mockSignToken = jest.fn();
const mockVerifyToken = jest.fn();

// ---------------- MODULE MOCKING ----------------

await jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  findByEmail: mockFindByEmail,
  createUser: mockCreateUser,
  toPublicUser: mockToPublicUser
}));

await jest.unstable_mockModule("../../src/utils/password.js", () => ({
  default: {
    hashPassword: mockHashPassword,
    comparePassword: mockComparePassword
  }
}));

await jest.unstable_mockModule("../../src/utils/jwt.js", () => ({
  signToken: mockSignToken,
  verifyToken: mockVerifyToken
}));

await jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  findByEmail: mockFindByEmail,
  createUser: mockCreateUser,
  toPublicUser: mockToPublicUser,
  updateLastLogin: mockUpdateLastLogin // ✅ ADD THIS
}));

// ---------------- IMPORT AFTER MOCK ----------------

const AuthController = await import("../../src/controllers/auth.controller.js");

describe("Auth Controller - Register", () => {

  let req, res;

  beforeEach(() => {
    req = {
      body: {
        name: "Test User",
        email: "test@gmail.com",
        password: "12345678",
        confirmPassword: "12345678"
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  test("✅ should register successfully", async () => {

    mockFindByEmail.mockResolvedValue(null);

    mockHashPassword.mockResolvedValue("hashed_password");

    mockCreateUser.mockResolvedValue({
      user_id: 1,
      email: "test@gmail.com",
      role: "user"
    });

    mockToPublicUser.mockReturnValue({
      user_id: 1,
      email: "test@gmail.com"
    });

    mockSignToken.mockReturnValue("fake_token");

    await AuthController.register(req, res);

    expect(mockFindByEmail).toHaveBeenCalledWith("test@gmail.com");
    expect(mockCreateUser).toHaveBeenCalled();
    expect(mockSignToken).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(201);
  });


  test("❌ should fail if email exists", async () => {

    mockFindByEmail.mockResolvedValue({
      user_id: 1,
      deleted_at: null
    });

    await AuthController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });


  test("❌ should fail if passwords do not match", async () => {

    req.body.confirmPassword = "wrong";

    await AuthController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });


  test("❌ should fail validation (invalid email)", async () => {

    req.body.email = "invalid-email";

    await AuthController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

});

describe("Auth Controller - Login", () => {

  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: "test@gmail.com",
        password: "12345678"
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test("✅ login success", async () => {

    mockFindByEmail.mockResolvedValue({
      user_id: 1,
      email: "test@gmail.com",
      password_hash: "hashed",
      role: "user"
    });

    mockComparePassword.mockResolvedValue(true);

    mockToPublicUser.mockReturnValue({
      user_id: 1,
      email: "test@gmail.com"
    });
    mockUpdateLastLogin.mockResolvedValue();

    mockSignToken.mockReturnValue("token");

    await AuthController.login(req, res,next);

    expect(res.status).toHaveBeenCalledWith(200);
    console.log(next.mock.calls);
  });


  test("❌ invalid credentials (user not found)", async () => {

    mockFindByEmail.mockResolvedValue(null);

    await AuthController.login(req, res,next);

    expect(res.status).toHaveBeenCalledWith(401);
  });


  test("❌ invalid credentials (wrong password)", async () => {

    mockFindByEmail.mockResolvedValue({
       user_id: 1,
  email: "test@gmail.com",
  password_hash: "hashed_password",
  role: "user"
    });

    mockComparePassword.mockResolvedValue(false);

    await AuthController.login(req, res,next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

});

describe("Auth Controller - validateToken", () => {

  test("✅ valid token", () => {

    const req = {
      headers: {
        authorization: "Bearer valid_token"
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockVerifyToken.mockReturnValue({
      userId: 1,
      email: "test@gmail.com",
      role: "user"
    });

    AuthController.validateToken(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });


  test("❌ invalid token", () => {

    const req = {
      headers: {
        authorization: "Bearer invalid"
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockVerifyToken.mockImplementation(() => {
      throw new Error("invalid");
    });

    AuthController.validateToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

});