// import "dotenv/config";
import request from "supertest";
import app from "../setup/testApp.js";
import { cleanDB } from "../setup/testDb.js";

describe("Auth Routes - Integration", () => {

  beforeEach(async () => {
    await cleanDB();
  });

  // ================= REGISTER =================

  test("✅ POST /auth/register - success", async () => {

    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Test User",
        email: "test@gmail.com",
        password: "12345678",
        confirmPassword: "12345678"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty("user");
    expect(res.body.data).toHaveProperty("token");
  });


  test("❌ POST /auth/register - duplicate email", async () => {

    // first register
    await request(app).post("/auth/register").send({
      name: "Test User",
      email: "test@gmail.com",
      password: "12345678",
      confirmPassword: "12345678"
    });

    // second attempt
    const res = await request(app).post("/auth/register").send({
      name: "Test User",
      email: "test@gmail.com",
      password: "12345678",
      confirmPassword: "12345678"
    });

    expect(res.statusCode).toBe(409);
  });

  // ================= LOGIN =================

  test("✅ POST /auth/login - success", async () => {

    // register first
    await request(app).post("/auth/register").send({
      name: "Test User",
      email: "test@gmail.com",
      password: "12345678",
      confirmPassword: "12345678"
    });

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "test@gmail.com",
        password: "12345678"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty("token");
  });


  test("❌ POST /auth/login - wrong password", async () => {

    await request(app).post("/auth/register").send({
      name: "Test User",
      email: "test@gmail.com",
      password: "12345678",
      confirmPassword: "12345678"
    });

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "test@gmail.com",
        password: "wrongpass"
      });

    expect(res.statusCode).toBe(401);
  });

});