import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { errorHandler } from "./middleware/error";
import { pool } from "./database";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Middlewares
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "api", uptime: process.uptime() });
});

app.get("/health/db", async (req, res, next) => {
  try {
    await pool.query("SELECT 1;");
    res.status(200).json({ db: "ok" });
  } catch (error) {
    next(error);
  }
});

app.use("/auth", authRoutes);

app.use((req, res, next) => {
  const error = new Error("Not Found") as any;
  error.status = 404;
  next(error);
});
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Server CORS origin: ${CORS_ORIGIN}`);
});
