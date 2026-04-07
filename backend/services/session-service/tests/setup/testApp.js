// tests/setup/testApp.js
import express from "express";
import connectionRoutes from "../../src/routes/connection.routes.js";
import sessionRoutes from "../../src/routes/session.routes.js";
import internalRoutes from "../../src/routes/internal.routes.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/connections", connectionRoutes);
app.use("/sessions", sessionRoutes);
app.use("/internal", internalRoutes);

app.use(errorHandler);

export default app;