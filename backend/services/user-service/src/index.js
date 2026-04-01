import "dotenv/config";
import express, { json } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(cors());
app.use(json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`User/Auth service running on :${port}`));
