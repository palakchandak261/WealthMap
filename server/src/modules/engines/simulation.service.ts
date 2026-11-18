/**
 * What-If Simulator
 * ──────────────────
 * Clones the current FinancialState in memory, applies a hypothetical
 * expense/income delta, re-runs forecasting + risk + health score on
 * the clone, then returns a side-by-side comparison.
 *
 * Nothing is written to the database — this is pure computation.
 */

import { FinancialState } from "./financialState.service";
import { runForecastingEngine, ForecastResult } from "./forecasting.service";
import { runRiskEngine, RiskResult } from "./risk.service";
import { runHealthScoreEngine, HealthScoreBreakdown } from "./healthScore.service";

export interface SimulationInput {
  amount:      number;   // hypothetical expense (positive) or income (negative)
  category?:   string;   // which budget category it hits
  description?: string;
}

export interface SimulationResult {
  input: SimulationInput;
  before: {
    riskScore:   number;
    riskLevel:   string;
    healthScore: number;
    healthGrade: string;
    projectedExpense:    number;
    cashBalance:         number;
    safeDaily:           number;
    budgetRemaining:     number;
  };
  after: {
    riskScore:   number;
    riskLevel:   string;
    healthScore: number;
    healthGrade: string;
    projectedExpense:    number;
    cashBalance:         number;
    safeDaily:           number;
    budgetRemaining:     number;
  };
  diff: {
    riskDelta:        number;
    healthDelta:      number;
    cashImpact:       number;
    budgetImpact:     number;
    projectedImpact:  number;
  };
  verdict: string;
  safe:    boolean;
}

// Deep-clone a FinancialState (plain object — no circular refs)
const cloneState = (state: FinancialState): FinancialState =>
  JSON.parse(JSON.stringify(state));

export const runSimulation = async (
  userId:    string,
  state:     FinancialState,
  forecast:  ForecastResult,
  risk:      RiskResult,
  health:    HealthScoreBreakdown,
  input:     SimulationInput
): Promise<SimulationResult> => {
  // ── BEFORE snapshots ─────────────────────────────────────────────────────────
  const before = {
    riskScore:        risk.riskScore,
    riskLevel:        risk.riskLevel,
    healthScore:      health.total,
    healthGrade:      health.grade,
    projectedExpense: forecast.projectedMonthlyExpense,
    cashBalance:      state.cashBalance,
    safeDaily:        state.safeDailySpending,
    budgetRemaining:  state.totalRemaining,
  };

  // ── Clone state and apply delta ───────────────────────────────────────────────
  const simState = cloneState(state);
  simState.totalSpent      += input.amount;
  simState.totalRemaining  -= input.amount;
  simState.cashBalance     -= input.amount;
  simState.overallUtilization = simState.totalBudget > 0
    ? Math.round((simState.totalSpent / simState.totalBudget) * 100)
    : 0;

  // Apply to the specific category if provided
  if (input.category) {
    const cat = simState.categories.find(
      (c) => c.category.toLowerCase() === input.category!.toLowerCase()
    );
    if (cat) {
      cat.spent       += input.amount;
      cat.remaining   -= input.amount;
      cat.utilization  = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0;
      cat.status =
        cat.utilization > 100  ? "EXCEEDED"  :
        cat.utilization === 100 ? "EXHAUSTED" :
        cat.utilization >= 90   ? "CRITICAL"  :
        cat.utilization >= 80   ? "WARNING"   : "NORMAL";
    }
  }

  // Recalculate safe-to-spend on cloned state
  const buffer         = Math.max(simState.totalBudget * 0.10, 500);
  simState.safeSpendableAmount = Math.max(
    simState.totalRemaining - (simState.dueThisMonthAmount ?? simState.totalUpcomingAmount) - buffer, 0
  );
  simState.safeDailySpending = simState.daysRemainingInMonth > 0
    ? Math.round(simState.safeSpendableAmount / simState.daysRemainingInMonth)
    : 0;

  // ── Re-run engines on cloned state ───────────────────────────────────────────
  // We pass a fake userId so risk engine doesn't persist a sim log
  const simForecast = buildSimForecast(forecast, input.amount);
  const simRisk     = buildSimRisk(risk, simState, simForecast);
  const simHealth   = runHealthScoreEngine(simState, simForecast, simRisk);

  const after = {
    riskScore:        simRisk.riskScore,
    riskLevel:        simRisk.riskLevel,
    healthScore:      simHealth.total,
    healthGrade:      simHealth.grade,
    projectedExpense: simForecast.projectedMonthlyExpense,
    cashBalance:      simState.cashBalance,
    safeDaily:        simState.safeDailySpending,
    budgetRemaining:  simState.totalRemaining,
  };

  const diff = {
    riskDelta:       after.riskScore       - before.riskScore,
    healthDelta:     after.healthScore     - before.healthScore,
    cashImpact:      after.cashBalance     - before.cashBalance,
    budgetImpact:    after.budgetRemaining - before.budgetRemaining,
    projectedImpact: after.projectedExpense - before.projectedExpense,
  };

  const safe    = after.riskScore < 60 && after.cashBalance > simState.totalUpcomingAmount;
  const verdict = buildVerdict(input.amount, diff, after, simState);

  return { input, before, after, diff, verdict, safe };
};

// ── Lightweight forecast adjustment (no async DB calls needed for simulation) ─
const buildSimForecast = (original: ForecastResult, extraAmount: number): ForecastResult => ({
  ...original,
  projectedMonthlyExpense: original.projectedMonthlyExpense + extraAmount,
  expectedExcess:          original.expectedExcess          + extraAmount,
  willExceedBudget:        (original.projectedMonthlyExpense + extraAmount) > original.currentBudget,
});

// ── Simple risk re-score without DB persist ────────────────────────────────────
const buildSimRisk = (
  original:  RiskResult,
  simState:  FinancialState,
  simForecast: ForecastResult
): RiskResult => {
  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);

  const budgetRisk     = clamp(simState.overallUtilization * (0.4 + 0.6 * (simState.daysRemainingInMonth / simState.totalDaysInMonth)));
  const cashAfter      = simState.cashBalance - simState.totalUpcomingAmount;
  const cashFlowRisk   = cashAfter < 0 ? 100 : clamp(Math.max(0, (1 - (cashAfter / Math.max(simState.totalUpcomingAmount, 1)) / 3) * 80));
  const obligationRisk = clamp((simState.totalUpcomingAmount / Math.max(simState.totalBudget, 1)) * 100 * 1.2);
  const velocityRisk   = original.components.velocityRisk;
  const goalRisk       = simForecast.expectedExcess > 0
    ? clamp(Math.min((simForecast.expectedExcess / Math.max(simState.totalBudget, 1)) * 150, 100))
    : 0;

  const riskScore = clamp(0.30 * budgetRisk + 0.25 * cashFlowRisk + 0.20 * obligationRisk + 0.15 * velocityRisk + 0.10 * goalRisk);
  const level     = (s: number) => s >= 81 ? "CRITICAL" : s >= 61 ? "HIGH" : s >= 31 ? "MODERATE" : "LOW";

  return {
    riskScore,
    riskLevel: level(riskScore) as RiskResult["riskLevel"],
    components: { budgetRisk, cashFlowRisk, obligationRisk, velocityRisk, goalRisk },
    alerts: [],
  };
};

const buildVerdict = (
  amount:   number,
  diff:     SimulationResult["diff"],
  after:    SimulationResult["after"],
  state:    FinancialState
): string => {
  if (after.cashBalance < 0)
    return `This purchase would put your cash balance negative. Avoid it until you have more cash.`;
  if (after.cashBalance < state.totalUpcomingAmount)
    return `After this purchase, your cash (₹${after.cashBalance.toLocaleString("en-IN")}) would be less than your upcoming obligations (₹${state.totalUpcomingAmount.toLocaleString("en-IN")}). Risky.`;
  if (diff.riskDelta > 20)
    return `This would significantly increase your risk score by ${diff.riskDelta} points (${after.riskLevel}). Consider waiting.`;
  if (diff.riskDelta > 10)
    return `Manageable, but your risk score rises by ${diff.riskDelta} points. Keep other spending tight this month.`;
  return `This purchase looks safe. Risk only increases by ${diff.riskDelta} points and you can still cover your obligations.`;
};
