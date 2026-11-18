/**
 * Health Score Engine
 * ────────────────────
 *   HealthScore = 0.25 × budgetAdherence
 *               + 0.20 × cashBuffer
 *               + 0.20 × obligationCoverage
 *               + 0.15 × spendingStability
 *               + 0.10 × savingsRate
 *               + 0.10 × goalProgress
 *
 * Each component is 0–100. Final score is 0–100.
 * Returns both the score and an explanation of each component.
 */

import { FinancialState } from "./financialState.service";
import { ForecastResult } from "./forecasting.service";
import { RiskResult } from "./risk.service";

export interface HealthScoreBreakdown {
  total:    number;
  grade:    "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  components: {
    budgetAdherence:       { score: number; explanation: string };
    cashBuffer:            { score: number; explanation: string };
    obligationCoverage:    { score: number; explanation: string };
    spendingStability:     { score: number; explanation: string };
    savingsRate:           { score: number; explanation: string };
    goalProgress:          { score: number; explanation: string };
  };
  insights: string[];  // positive and warning messages
}

const clamp  = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);
const grade  = (s: number) =>
  s >= 85 ? "EXCELLENT" : s >= 70 ? "GOOD" : s >= 50 ? "FAIR" : "POOR";

export const runHealthScoreEngine = (
  state:    FinancialState,
  forecast: ForecastResult,
  risk:     RiskResult
): HealthScoreBreakdown => {
  const insights: string[] = [];

  // ── 1. Budget Adherence (25%) ────────────────────────────────────────────────
  // Perfect = spending within budget; penalise projected overruns
  const adherenceRaw = forecast.willExceedBudget
    ? Math.max(0, 100 - (forecast.expectedExcess / Math.max(state.totalBudget, 1)) * 100)
    : 100 - Math.max(0, state.overallUtilization - 70); // slight penalty for >70% early
  const budgetAdherenceScore = clamp(adherenceRaw);
  const budgetExplanation = forecast.willExceedBudget
    ? `Projected to overspend by ₹${forecast.expectedExcess.toLocaleString("en-IN")}`
    : `Spending within budget (${state.overallUtilization}% used)`;

  // ── 2. Cash Buffer (20%) ─────────────────────────────────────────────────────
  // Score based on how many months of expenses the cash balance covers
  const monthsOfCash = state.avgDailySpending > 0
    ? state.cashBalance / (state.avgDailySpending * 30)
    : 3; // default good if no spending yet
  const cashBufferScore = clamp(Math.min(monthsOfCash / 3, 1) * 100);
  const cashExplanation = `Cash covers ~${monthsOfCash.toFixed(1)} months of current spending`;
  if (monthsOfCash < 1) insights.push("⚠️ Cash balance covers less than 1 month of expenses");

  // ── 3. Obligation Coverage (20%) ─────────────────────────────────────────────
  // 100% = can cover all upcoming obligations with 2× buffer
  const coverageRatio = state.totalUpcomingAmount > 0
    ? state.cashBalance / state.totalUpcomingAmount
    : 3;
  const obligationScore = clamp(Math.min(coverageRatio / 2, 1) * 100);
  const obligationExplanation = state.totalUpcomingAmount > 0
    ? `Cash covers ${coverageRatio.toFixed(1)}× upcoming obligations`
    : "No upcoming obligations this period";
  if (coverageRatio < 1.2) insights.push("⚠️ EMI or obligation coverage is thin — avoid large discretionary spends");
  if (coverageRatio >= 2) insights.push("✅ Upcoming obligations are well covered");

  // ── 4. Spending Stability (15%) ──────────────────────────────────────────────
  // Penalise velocity spikes
  const vc = forecast.velocityChangePercent;
  const stabilityScore = clamp(vc >= 0 ? Math.max(100 - vc * 1.5, 0) : 100);
  const stabilityExplanation = vc > 0
    ? `Spending ${vc}% faster than last month`
    : vc < 0
    ? `Spending ${Math.abs(vc)}% slower than last month — great`
    : "Spending pace unchanged from last month";
  if (vc >= 30) insights.push(`📈 Spending velocity up ${vc}% — the main drag on your health score`);
  if (vc <= -10) insights.push(`📉 Spending slowed by ${Math.abs(vc)}% vs last month`);

  // ── 5. Savings Rate (10%) ────────────────────────────────────────────────────
  // (savings / declared income) scaled to 0–100; target 20% savings rate
  const income = state.declaredMonthlyIncome || 1;
  const savingsRate = state.savingsBalance / income; // rough proxy
  const savingsScore = clamp(Math.min(savingsRate / 0.2, 1) * 100);
  const savingsExplanation = `Savings balance is ${((savingsRate) * 100).toFixed(0)}% of monthly income`;
  if (savingsScore >= 80) insights.push("✅ Savings balance looks healthy");

  // ── 6. Goal Progress (10%) ───────────────────────────────────────────────────
  const avgGoalProgress = state.activeGoals.length > 0
    ? state.activeGoals.reduce((s, g) => s + g.progress, 0) / state.activeGoals.length
    : 100; // no goals = no drag
  const goalScore = clamp(avgGoalProgress);
  const goalExplanation = state.activeGoals.length > 0
    ? `Average goal progress: ${avgGoalProgress.toFixed(0)}%`
    : "No active savings goals";

  // ── Weighted total ───────────────────────────────────────────────────────────
  const total = clamp(
    0.25 * budgetAdherenceScore +
    0.20 * cashBufferScore +
    0.20 * obligationScore +
    0.15 * stabilityScore +
    0.10 * savingsScore +
    0.10 * goalScore
  );

  // Positive reinforcement for staying under safe-to-spend
  const ap = state.appreciation;
  if (ap?.eligible) insights.unshift(`🎉 You're ₹${ap.savedSoFar.toLocaleString("en-IN")} under your safe-to-spend allowance this month — keep it up!`);

  if (insights.length === 0) insights.push("✅ All financial health indicators look good");

  return {
    total,
    grade: grade(total),
    components: {
      budgetAdherence:    { score: budgetAdherenceScore,  explanation: budgetExplanation },
      cashBuffer:         { score: cashBufferScore,        explanation: cashExplanation },
      obligationCoverage: { score: obligationScore,        explanation: obligationExplanation },
      spendingStability:  { score: stabilityScore,         explanation: stabilityExplanation },
      savingsRate:        { score: savingsScore,           explanation: savingsExplanation },
      goalProgress:       { score: goalScore,              explanation: goalExplanation },
    },
    insights,
  };
};
