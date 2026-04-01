import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import messageRoutes from "./routes/message.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { initSocket } from "./sockets/socket.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/communication/health", (_, res) => res.json({ ok: true }));

app.use("/communication", messageRoutes);
app.use("/communication/internal", internalRoutes);

app.use(errorHandler);

const server = http.createServer(app);
const io = initSocket(server);

// make io available to internal controllers
app.set("io", io);

const port = Number(process.env.PORT || 4004);
server.listen(port, () => console.log(`Communication service running on :${port}`));
