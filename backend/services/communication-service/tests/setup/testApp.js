// tests/setup/testApp.js
// We build the Express app manually here instead of importing index.js
// because index.js creates an http.Server + real Socket.IO which
// interferes with supertest. We inject a mock `io` instead.
import express from "express";
import messageRoutes from "../../src/routes/message.routes.js";
import internalRoutes from "../../src/routes/internal.routes.js";
import { errorHandler } from "../../src/middlewares/error.middleware.js";

const app = express();
app.use(express.json());

app.get("/communication/health", (_, res) => res.json({ ok: true }));

app.use("/communication", messageRoutes);
app.use("/communication/internal", internalRoutes);

app.use(errorHandler);

// Mock Socket.IO instance — records emitted events for assertions
export function createMockIo() {
  const emitted = [];
  const io = {
    to: () => ({
      emit: (event, data) => {
        emitted.push({ event, data });
      },
    }),
    _emitted: emitted,
  };
  return io;
}

// Attach a fresh mock io before each test that needs it
export function attachMockIo(mockIo) {
  app.set("io", mockIo);
}

export default app;