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

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth",        authRouter);
app.use("/api/v1/users",       usersRouter);
app.use("/api/v1/income",      incomeRouter);
app.use("/api/v1/expenses",    expensesRouter);
app.use("/api/v1/budgets",     budgetsRouter);
app.use("/api/v1/obligations", obligationsRouter);
app.use("/api/v1/goals",       goalsRouter);
app.use("/api/v1/engine",      enginesRouter);
app.use("/api/v1/ai",          aiRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "WealthMap API" });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 WealthMap server running → http://localhost:${PORT}`);
});
