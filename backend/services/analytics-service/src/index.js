import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes/analytics.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/analytics", routes);

app.listen(4005, () => console.log("Analytics service running on :4005"));