// tests/setup/testApp.js
import express from "express";
import searchRoutes from "../../src/routes/search.routes.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/search", searchRoutes);
app.use(errorHandler);

export default app;