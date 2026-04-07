// tests/setup/testApp.js
import express from "express";
import profileRoutes from "../../src/routes/profile.routes.js";
import internalRoutes from "../../src/routes/internal.routes.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";

const app = express();
app.use(express.json());
app.use("/profiles", profileRoutes);
app.use("/", internalRoutes);
app.use(errorHandler);

export default app;