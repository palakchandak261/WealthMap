/**
 * Risk Engine
 * ────────────
 * Computes 5 component risk scores (each 0–100) and combines them:
 *
 *   RiskScore = 0.30 × budgetRisk
 *             + 0.25 × cashFlowRisk
 *             + 0.20 × obligationRisk
 *             + 0.15 × velocityRisk
 *             + 0.10 × goalRisk
 *
 * Saves the result to risk_logs so the frontend can show trends.
 */

import prisma from "../../lib/prisma";
import { FinancialState } from "./financialState.service";
import { ForecastResult } from "./forecasting.service";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RiskResult {
  riskScore:     number;           // 0–100
  riskLevel:     RiskLevel;
  components: {
    budgetRisk:     number;
    cashFlowRisk:   number;
    obligationRisk: number;
    velocityRisk:   number;
    goalRisk:       number;
  };
  alerts: string[];                // human-readable flags
}

const clamp  = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);
const level  = (score: number): RiskLevel =>
  score >= 81 ? "CRITICAL" : score >= 61 ? "HIGH" : score >= 31 ? "MODERATE" : "LOW";

export const runRiskEngine = async (
  userId:   string,
  state:    FinancialState,
  forecast: ForecastResult
): Promise<RiskResult> => {
  const alerts: string[] = [];

  // ── 1. Budget Risk ───────────────────────────────────────────────────────────
  // High utilization + lots of days remaining = very risky
  const daysRemainingFactor = state.daysRemainingInMonth / state.totalDaysInMonth; // 0–1
  const rawBudget = state.overallUtilization * (0.4 + 0.6 * daysRemainingFactor);
  const budgetRisk = clamp(rawBudget);
  if (budgetRisk >= 80) alerts.push("⚠️ Budget utilization is critically high for this point in the month");
  if (forecast.willExceedBudget) alerts.push(`🔴 Spending projected to exceed budget by ₹${forecast.expectedExcess.toLocaleString("en-IN")}`);

  // ── 2. Cash-Flow Risk ────────────────────────────────────────────────────────
  // Can the user cover upcoming obligations from current cash?
  const cashAfterObligations = state.cashBalance - state.totalUpcomingAmount;
  let cashFlowRisk = 0;
  if (state.totalUpcomingAmount === 0) {
    cashFlowRisk = 0;
  } else if (cashAfterObligations < 0) {
    cashFlowRisk = 100;
    alerts.push(`🔴 Cash shortfall of ₹${Math.abs(cashAfterObligations).toLocaleString("en-IN")} — upcoming obligations may not be covered`);
  } else {
    // The less buffer the higher the risk (0 buffer = 80 risk, 3× buffer = 0 risk)
    const bufferRatio = cashAfterObligations / state.totalUpcomingAmount;
    cashFlowRisk = clamp(Math.max(0, (1 - bufferRatio / 3) * 80));
  }

  // ── 3. Obligation Risk ───────────────────────────────────────────────────────
  // Based on how soon obligations are due and how much they are vs. budget
  const obligationBurden = state.totalBudget > 0
    ? (state.totalUpcomingAmount / state.totalBudget) * 100
    : 0;
  const obligationRisk = clamp(obligationBurden * 1.2);
  if (obligationBurden > 60) alerts.push("🟡 Upcoming obligations are a significant portion of the monthly budget");

  // ── 4. Velocity Risk ────────────────────────────────────────────────────────
  // How much faster are we spending vs last month?
  const vc = forecast.velocityChangePercent;
  let velocityRisk = 0;
  if (vc > 0) velocityRisk = clamp(Math.min(vc * 1.5, 100));
  if (vc >= 30) alerts.push(`📈 Spending velocity increased by ${vc}% vs last month`);

  // ── 5. Goal Risk ─────────────────────────────────────────────────────────────
  // If projected excess is large, goals will be impacted
  const goalRisk = state.activeGoals.length === 0 ? 0
    : clamp(forecast.expectedExcess > 0
        ? Math.min((forecast.expectedExcess / Math.max(state.totalBudget, 1)) * 100 * 1.5, 100)
        : 0);
  if (goalRisk >= 50) alerts.push("🎯 Overspending may delay one or more savings goals");

  // ── Composite score ──────────────────────────────────────────────────────────
  const riskScore = clamp(
    0.30 * budgetRisk +
    0.25 * cashFlowRisk +
    0.20 * obligationRisk +
    0.15 * velocityRisk +
    0.10 * goalRisk
  );

  // Persist to risk_logs
  await prisma.riskLog.create({
    data: {
      userId,
      riskScore,
      riskLevel:     level(riskScore),
      budgetRisk,
      cashFlowRisk,
      obligationRisk,
      velocityRisk,
      goalRisk,
    },
  });

  if (alerts.length === 0) alerts.push("✅ No significant risk factors detected");

  return {
    riskScore,
    riskLevel: level(riskScore),
    components: { budgetRisk, cashFlowRisk, obligationRisk, velocityRisk, goalRisk },
    alerts,
  };
};
