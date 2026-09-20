/**
 * Forecasting Engine
 * ──────────────────
 * Weighted multi-signal expense projection:
 *   Projected = 0.50 × currentMonthVelocity
 *             + 0.30 × historicalMonthlyAverage
 *             + 0.20 × recent7DayTrend
 *
 * Also predicts per-category overruns and spending velocity change.
 */

import prisma from "../../lib/prisma";
import { FinancialState } from "./financialState.service";
import { monthRange } from "../../lib/dateHelpers";

export interface CategoryForecast {
  category:       string;
  budget:         number;
  spent:          number;
  projected:      number;
  expectedExcess: number;      // positive = over budget
  willExceed:     boolean;
}

export interface ForecastResult {
  projectedMonthlyExpense: number;
  currentBudget:           number;
  expectedExcess:          number;    // positive = over budget
  willExceedBudget:        boolean;
  // Velocity comparison
  previousAvgDailySpending: number;
  currentAvgDailySpending:  number;
  velocityChangePercent:    number;   // positive = spending faster
  // Per-category breakdown
  categoryForecasts:        CategoryForecast[];
}

export const runForecastingEngine = async (
  userId: string,
  state:  FinancialState
): Promise<ForecastResult> => {
  const { month, year, totalDaysInMonth, daysPassedInMonth, avgDailySpending, totalBudget } = state;

  // ── Historical average: last 3 completed months ──────────────────────────────
  const historicalTotals: number[] = [];
  for (let i = 1; i <= 3; i++) {
    let m = month - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }

    const { start, end } = monthRange(m, y);
    const rows = await prisma.expense.aggregate({
      where:  { userId, spentAt: { gte: start, lte: end } },
      _sum:   { amount: true },
    });
    historicalTotals.push(Number(rows._sum.amount ?? 0));
  }
  const historicalAvg = historicalTotals.length > 0
    ? historicalTotals.reduce((s, v) => s + v, 0) / historicalTotals.length
    : 0;

  // ── Recent 7-day trend: annualise to monthly ──────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent7 = await prisma.expense.aggregate({
    where:  { userId, spentAt: { gte: sevenDaysAgo } },
    _sum:   { amount: true },
  });
  const recent7Total      = Number(recent7._sum.amount ?? 0);
  const recent7DailyAvg   = recent7Total / 7;
  const recent7MonthlyEst = recent7DailyAvg * totalDaysInMonth;

  // ── Current month velocity projection ────────────────────────────────────────
  const currentVelocityMonthly = avgDailySpending * totalDaysInMonth;

  // ── Weighted projection ───────────────────────────────────────────────────────
  const projected = Math.round(
    0.50 * currentVelocityMonthly +
    0.30 * historicalAvg +
    0.20 * recent7MonthlyEst
  );

  // ── Velocity change vs last month ────────────────────────────────────────────
  let prevM = month - 1;
  let prevY = year;
  if (prevM <= 0) { prevM = 12; prevY -= 1; }
  const { start: ps, end: pe } = monthRange(prevM, prevY);
  const prevRows = await prisma.expense.aggregate({
    where:  { userId, spentAt: { gte: ps, lte: pe } },
    _sum:   { amount: true },
  });
  const prevTotal = Number(prevRows._sum.amount ?? 0);
  const prevDailyAvg = prevTotal / new Date(prevY, prevM, 0).getDate();
  const velocityChange = prevDailyAvg > 0
    ? Math.round(((avgDailySpending - prevDailyAvg) / prevDailyAvg) * 100)
    : 0;

  // ── Per-category forecasts ────────────────────────────────────────────────────
  const categoryForecasts: CategoryForecast[] = state.categories.map((cat) => {
    const catDailyAvg   = daysPassedInMonth > 0 ? cat.spent / daysPassedInMonth : 0;
    const catProjected  = Math.round(catDailyAvg * totalDaysInMonth);
    const excess        = catProjected - cat.budget;
    return {
      category:       cat.category,
      budget:         cat.budget,
      spent:          cat.spent,
      projected:      catProjected,
      expectedExcess: excess,
      willExceed:     excess > 0,
    };
  });

  return {
    projectedMonthlyExpense:   projected,
    currentBudget:             totalBudget,
    expectedExcess:            projected - totalBudget,
    willExceedBudget:          projected > totalBudget,
    previousAvgDailySpending:  Math.round(prevDailyAvg),
    currentAvgDailySpending:   Math.round(avgDailySpending),
    velocityChangePercent:     velocityChange,
    categoryForecasts,
  };
};
