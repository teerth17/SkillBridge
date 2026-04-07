// tests/setup/testApp.js
import express from "express";
import videoCallRoutes from "../../src/routes/videocall.routes.js";
import reviewRoutes from "../../src/routes/review.routes.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/video-calls", videoCallRoutes);
app.use("/video-calls", reviewRoutes);

app.use(errorHandler);

export default app;