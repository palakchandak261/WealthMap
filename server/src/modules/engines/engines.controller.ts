/**
 * Engines Controller
 * ───────────────────
 * All engine endpoints follow the same pattern:
 *   1. Build FinancialState (the digital twin)
 *   2. Pass it to the relevant engine(s)
 *   3. Return the result
 *
 * The financial state is always built fresh per request so data is never stale.
 */

import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";
import { buildFinancialState } from "./financialState.service";
import { runForecastingEngine } from "./forecasting.service";
import { runRiskEngine } from "./risk.service";
import { runHealthScoreEngine } from "./healthScore.service";
import { buildDependencyGraph, getGraphForUser, getCascadingImpact } from "./dependency.service";
import { runSimulation } from "./simulation.service";
import { buildPlanningSnapshot } from "./planning.service";
import prisma from "../../lib/prisma";

// ── GET /engine/planning?inflationRate=6&inflation=off ───────────────────────
// Goal plans ("save ₹X/month"), savings allocation, yearly inflation projection
export const getPlanning = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rateParam = req.query.inflationRate;
    const rate = rateParam !== undefined && rateParam !== "" ? Number(rateParam) : null;
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 50)) {
      return next(Object.assign(new Error("inflationRate must be between 0 and 50"), { statusCode: 400, code: "VALIDATION_ERROR" }));
    }
    const state    = await buildFinancialState(req.userId!);
    const forecast = await runForecastingEngine(req.userId!, state);
    ok(res, await buildPlanningSnapshot(req.userId!, state, forecast, {
      inflationRate:    rate,
      inflationEnabled: req.query.inflation !== "off",
    }));
  } catch (err) { next(err); }
};

// ── GET /engine/financial-state ───────────────────────────────────────────────
export const getFinancialState = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const state = await buildFinancialState(req.userId!);
    ok(res, state);
  } catch (err) { next(err); }
};

// ── GET /engine/forecast ──────────────────────────────────────────────────────
export const getForecast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const state    = await buildFinancialState(req.userId!);
    const forecast = await runForecastingEngine(req.userId!, state);
    ok(res, forecast);
  } catch (err) { next(err); }
};

// ── GET /engine/risk ──────────────────────────────────────────────────────────
export const getRisk = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const state    = await buildFinancialState(req.userId!);
    const forecast = await runForecastingEngine(req.userId!, state);
    const risk     = await runRiskEngine(req.userId!, state, forecast);
    ok(res, risk);
  } catch (err) { next(err); }
};

// ── GET /engine/health-score ──────────────────────────────────────────────────
export const getHealthScore = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const state    = await buildFinancialState(req.userId!);
    const forecast = await runForecastingEngine(req.userId!, state);
    const risk     = await runRiskEngine(req.userId!, state, forecast);
    const health   = runHealthScoreEngine(state, forecast, risk);
    ok(res, health);
  } catch (err) { next(err); }
};

// ── GET /engine/safe-to-spend ─────────────────────────────────────────────────
export const getSafeToSpend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const state = await buildFinancialState(req.userId!);
    ok(res, {
      safeSpendableAmount: state.safeSpendableAmount,
      safeDailySpending:   state.safeDailySpending,
      daysRemaining:       state.daysRemainingInMonth,
      budgetRemaining:     state.totalRemaining,
      upcomingObligations: state.totalUpcomingAmount,
      dueThisMonth:        state.dueThisMonthAmount ?? 0,
      appreciation:        state.appreciation ?? null,
    });
  } catch (err) { next(err); }
};

// ── GET /engine/dependency-graph ──────────────────────────────────────────────
export const getDependencyGraph = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const state = await buildFinancialState(req.userId!);
    // Rebuild graph from latest state, then return it
    const graph = await buildDependencyGraph(req.userId!, state);
    ok(res, graph);
  } catch (err) { next(err); }
};

// ── GET /engine/anomalies ─────────────────────────────────────────────────────
// Z-score based anomaly detection per category
export const getAnomalies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Get last 3 months of expenses to build baseline
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const expenses = await prisma.expense.findMany({
      where:   { userId, spentAt: { gte: threeMonthsAgo } },
      orderBy: { spentAt: "desc" },
    });

    // Group by category
    const byCategory: Record<string, number[]> = {};
    for (const exp of expenses) {
      if (!byCategory[exp.category]) byCategory[exp.category] = [];
      byCategory[exp.category].push(Number(exp.amount));
    }

    // Compute mean + std dev per category, flag z-score > 2
    const anomalies: { expense: typeof expenses[0]; zscore: number; categoryMean: number; categoryStd: number }[] = [];

    for (const [category, amounts] of Object.entries(byCategory)) {
      if (amounts.length < 3) continue; // need enough data

      const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
      const std  = Math.sqrt(amounts.map((v) => (v - mean) ** 2).reduce((s, v) => s + v, 0) / amounts.length);

      if (std === 0) continue;

      for (const exp of expenses.filter((e) => e.category === category)) {
        const z = (Number(exp.amount) - mean) / std;
        if (z > 2) {
          anomalies.push({
            expense: exp,
            zscore:  Math.round(z * 100) / 100,
            categoryMean: Math.round(mean),
            categoryStd:  Math.round(std),
          });
        }
      }
    }

    ok(res, {
      count:     anomalies.length,
      anomalies: anomalies.sort((a, b) => b.zscore - a.zscore),
    });
  } catch (err) { next(err); }
};

// ── GET /engine/risk-history ──────────────────────────────────────────────────
export const getRiskHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const logs  = await prisma.riskLog.findMany({
      where:   { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take:    limit,
    });
    ok(res, logs);
  } catch (err) { next(err); }
};

// ── POST /engine/simulate ─────────────────────────────────────────────────────
export const simulate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, category, description } = req.body;

    if (!amount || isNaN(Number(amount))) {
      return next(Object.assign(new Error("amount is required and must be a number"), { statusCode: 400, code: "VALIDATION_ERROR" }));
    }

    const state    = await buildFinancialState(req.userId!);
    const forecast = await runForecastingEngine(req.userId!, state);
    const risk     = await runRiskEngine(req.userId!, state, forecast);
    const health   = runHealthScoreEngine(state, forecast, risk);

    const result = await runSimulation(req.userId!, state, forecast, risk, health, {
      amount:      Number(amount),
      category,
      description,
    });

    ok(res, result);
  } catch (err) { next(err); }
};
