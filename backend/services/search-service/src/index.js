import "dotenv/config";
import express from "express";
import cors from "cors";
import searchRoutes from "./routes/search.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/search", searchRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 4003);
app.listen(port, () => console.log(`Search service running on :${port}`));