// tests/setup/testApp.js
import express from "express";
import analyticsRoutes from "../../src/routes/analytics.routes.js";
import reviewRoutes from "../../src/routes/review.routes.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/analytics", analyticsRoutes);
app.use("/analytics", reviewRoutes);
app.use(errorHandler);

export default app;