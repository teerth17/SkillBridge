import "dotenv/config";
import express from "express";
import cors from "cors";
import profileRoutes from "./routes/profile.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/profiles", profileRoutes);
app.use("/", internalRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 4001);
app.listen(port, () => console.log(`Profile service running on :${port}`));
