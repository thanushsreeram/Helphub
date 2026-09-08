import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cluster from "node:cluster";
import os from "node:os";
import crypto from "node:crypto";

import pool from "./src/config/database.js";
import { initializeDatabase } from "./src/config/initDb.js";

import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import workerRoutes from "./src/routes/workerRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import reviewRoutes from "./src/routes/reviewRoutes.js";

dotenv.config();
initializeDatabase().catch((err) =>
  console.error("Failed to initialize database schema:", err),
);

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(process.env.CORS_ORIGIN || "*").split(","),
  ]
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  // 1. CORS MUST BE FIRST (Prevents "Failed to fetch" browser errors)
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }
        // Return false instead of Error to avoid 500 Internal Server Error status
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    }),
  );

  // 2. Response Compression (Reduces network payload bandwidth by up to 80%)
  app.use(compression());

  app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    const startedAt = process.hrtime.bigint();
    res.setHeader("X-Request-Id", requestId);

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      console.info(
        JSON.stringify({
          requestId,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        }),
      );
    });

    next();
  });

  // 3. Rate Limiting (Protects server against DDoS in production)
  const isProd = process.env.NODE_ENV === "production";

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 300 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message:
        "Too many requests from this IP, please try again after 15 minutes.",
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 30 : 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many login/registration attempts, please try again later.",
    },
  });

  app.use("/api/", generalLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // 4. JSON Payload Parser with bounded request bodies.
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // 5. In-Memory Micro-Cache for Services Endpoint
  let cachedServices = null;
  let cacheExpiry = 0;

  app.get("/api/services", async (req, res, next) => {
    try {
      const now = Date.now();
      if (cachedServices && now < cacheExpiry) {
        return res.json({
          success: true,
          cached: true,
          services: cachedServices,
        });
      }

      const result = await pool.query(
        "SELECT id, name, description, category FROM services ORDER BY id",
      );

      cachedServices = result.rows;
      cacheExpiry = now + 60000;

      return res.json({
        success: true,
        services: result.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  // 6. API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/workers", workerRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/reviews", reviewRoutes);

  // Home & Health
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "Welcome to HelpHub Scalable High-Performance API",
      pid: process.pid,
    });
  });

  app.get("/api/health", async (req, res, next) => {
    try {
      const result = await pool.query("SELECT current_database()");
      res.json({
        success: true,
        message: "HelpHub backend is running smoothly",
        database: result.rows[0].current_database,
        pid: process.pid,
      });
    } catch (error) {
      next(error);
    }
  });

  // 7. Global Error Handler Middleware
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === "entity.too.large" ? 413 : 500);

    console.error(
      JSON.stringify({
        requestId: res.getHeader("X-Request-Id"),
        method: req.method,
        path: req.originalUrl,
        status,
        error: err.message,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
      }),
    );

    res.status(status).json({
      success: false,
      message:
        status === 413
          ? "Request body is too large"
          : process.env.NODE_ENV === "production"
            ? "An unexpected server error occurred"
            : err.message || "An unexpected server error occurred",
    });
  });

  return app;
}

const app = createApp();
export default app;

// Standalone Server & Multi-Core Cluster Setup (for Node / Render / Local execution)
if (!process.env.VERCEL) {
  const numCPUs = Math.min(os.cpus().length, 4);
  const isMaster = cluster.isPrimary || cluster.isMaster;

  if (isMaster && process.env.NODE_ENV === "production") {
    console.log(
      `⚡ Primary cluster manager running (PID: ${process.pid}). Forking ${numCPUs} worker processes...`,
    );

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      console.warn(
        `⚠️ Worker process ${worker.process.pid} died. Spawning replacement process...`,
      );
      cluster.fork();
    });
  } else {
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(
        `🚀 HelpHub server [PID ${process.pid}] running on http://localhost:${PORT}`,
      );
    });

    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} signal received. Closing HTTP server...`);
      server.close(() => {
        console.log("HTTP server closed.");
        pool.end().finally(() => process.exit(0));
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}

// Global Process Anti-Crash Handlers
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception caught at process level:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "❌ Unhandled Rejection at promise:",
    promise,
    "reason:",
    reason,
  );
  process.exit(1);
});
