import "dotenv/config";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/error";
import { pool } from "./database";
import authRoutes from "./modules/auth/auth.routes";
import squadRoutes from "./modules/squads/squads.routes";
import fixtureRoutes from "./modules/fixtures/fixtures.routes";
import lineupsRoutes from "./modules/lineups/lineups.routes";
import usersRoutes from "./modules/users/users.routes";
import { setUserFromCookie } from "./middleware/auth";

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const RAW_ORIGINS = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const ALLOWED_ORIGINS = RAW_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

if (process.env.NODE_ENV === "production") {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "https:"],
          "style-src": ["'self'", "https:"],
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'", ...ALLOWED_ORIGINS],
        },
      },
    })
  );
} else {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "https:"],
          "style-src": ["'self'", "https:", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": [
            "'self'",
            ...ALLOWED_ORIGINS,
            ...ALLOWED_ORIGINS.map((o) => o.replace(/^http/, "ws")),
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
}

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Length"],
  maxAge: 600,
};
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(setUserFromCookie);

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
app.use("/", squadRoutes);
app.use("/", fixtureRoutes);
app.use("/", lineupsRoutes);
app.use("/", usersRoutes);

app.use((req, res, next) => {
  const error = new Error("Not Found") as any;
  error.status = 404;
  next(error);
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(
    `Allowed CORS origins: ${ALLOWED_ORIGINS.join(", ") || "(none)"}`
  );
});
