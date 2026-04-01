import "dotenv/config";
import express from "express";
import cors from "cors";
import videoCallRoutes from "./routes/videocall.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/video-calls", videoCallRoutes);
app.use("/video-calls", reviewRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 4006);
app.listen(port, () => console.log(`Video Call service running on :${port}`));