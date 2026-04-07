import "dotenv/config";
import express from "express";
import cors from "cors";
import analyticsRoutes from "./routes/analytics.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/analytics", analyticsRoutes);
app.use("/analytics", reviewRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 4005);
app.listen(port, () => console.log(`Analytics service running on :${port}`));