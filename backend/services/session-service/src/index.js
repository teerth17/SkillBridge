import "dotenv/config";
import express from "express";
import cors from "cors";
import connectionRoutes from "./routes/connection.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/connections", connectionRoutes);
app.use("/sessions", sessionRoutes);
app.use("/internal", internalRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 4002);
app.listen(port, () => console.log(`Session service running on :${port}`));
