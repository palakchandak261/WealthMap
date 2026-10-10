import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./modules/auth/auth.router";
import { usersRouter } from "./modules/users/users.router";
import { incomeRouter } from "./modules/income/income.router";
import { expensesRouter } from "./modules/expenses/expenses.router";
import { budgetsRouter } from "./modules/budgets/budgets.router";
import { obligationsRouter } from "./modules/obligations/obligations.router";
import { goalsRouter } from "./modules/goals/goals.router";
import { enginesRouter } from "./modules/engines/engines.router";
import { aiRouter } from "./modules/ai/ai.router";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

const configuredOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);

if (process.env.NODE_ENV !== "production") {
  for (const origin of configuredOrigins) {
    try {
      const localOrigin = new URL(origin);
      if (localOrigin.hostname === "localhost" || localOrigin.hostname === "127.0.0.1") {
        localOrigin.hostname = localOrigin.hostname === "localhost" ? "127.0.0.1" : "localhost";
        allowedOrigins.add(localOrigin.origin);
      }
    } catch {
      console.warn(`Ignoring invalid CLIENT_URL origin: ${origin}`);
    }
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(apiLimiter);  // gentle rate limit on all routes

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth",        authRouter);
app.use("/api/v1/users",       usersRouter);
app.use("/api/v1/income",      incomeRouter);
app.use("/api/v1/expenses",    expensesRouter);
app.use("/api/v1/budgets",     budgetsRouter);
app.use("/api/v1/obligations", obligationsRouter);
app.use("/api/v1/goals",       goalsRouter);
app.use("/api/v1/engine",      enginesRouter);
app.use("/api/v1/ai",          aiRouter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "WealthMap API", timestamp: new Date().toISOString() });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 WealthMap server → http://localhost:${PORT}`);
});
