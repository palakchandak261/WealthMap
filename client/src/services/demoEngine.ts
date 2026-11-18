/**
 * Demo Engine — browser-side port of the backend engines
 * ──────────────────────────────────────────────────────
 * Demo mode has no server, so these functions recompute everything from the
 * localStorage demo store using the SAME formulas as server/src/modules/engines
 * (financial state, forecast, risk, health score, simulation, dependency graph,
 * planning) and the same rule-based advisor as server/src/modules/ai.
 * Adding an expense in demo mode therefore moves every number realistically.
 */

import type {
  FinancialState, FinancialCategoryState, ForecastResult, RiskResult, RiskLevel,
  HealthScoreResult, SimulationResult, DependencyGraph, GraphNode, GraphEdge,
  PlanningSnapshot, AIInsight, InsightCategory, AIRecommendation, Goal, Budget,
} from '../types';
import type { MockStore } from './mockData';
import {
  buildAppreciation, buildGoalPlan, buildSavingsPlan, buildYearlyProjection,
  isFixedExpense, inr, monthLabel,
} from '../utils/finance';

const DAY = 86_400_000;
const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);
const t = (d: string | Date) => new Date(d).getTime();

const monthBounds = (month: number, year: number) => ({
  start: new Date(year, month - 1, 1),
  end: new Date(year, month, 0, 23, 59, 59, 999),
});
const daysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

export const findBudget = (store: MockStore, month: number, year: number): Budget | undefined =>
  store.budgets.find((b) => b.month === month && b.year === year);

const sortGoals = <G extends Pick<Goal, 'priority' | 'deadline'>>(goals: G[]) =>
  [...goals].sort((a, b) =>
    PRIORITY_ORDER[a.priority ?? 'MEDIUM'] - PRIORITY_ORDER[b.priority ?? 'MEDIUM'] ||
    (a.deadline ? t(a.deadline) : Infinity) - (b.deadline ? t(b.deadline) : Infinity));

// ─────────────────────────────────────────────────────────────────────────────
// Financial state (digital twin)
// ─────────────────────────────────────────────────────────────────────────────
export const buildDemoFinancialState = (store: MockStore): FinancialState => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const { start, end } = monthBounds(m, y);
  const inMonth = (d: string) => t(d) >= start.getTime() && t(d) <= end.getTime();

  const budget = findBudget(store, m, y);
  const expenses = store.expenses.filter((e) => inMonth(e.spentAt));
  const incomes = store.incomes.filter((i) => inMonth(i.receivedAt));
  const windowStart = Math.min(start.getTime(), now.getTime());
  const obligations = store.obligations
    .filter((o) => !o.isPaid && t(o.dueDate) >= windowStart && t(o.dueDate) <= now.getTime() + 30 * DAY)
    .sort((a, b) => t(a.dueDate) - t(b.dueDate));
  const goals = sortGoals(store.goals.filter((g) => g.status === 'ACTIVE'));

  const spentByCategory: Record<string, number> = {};
  const fixedByCategory: Record<string, number> = {};
  let totalSpent = 0;
  let fixedSpent = 0;
  for (const e of expenses) {
    const amt = Number(e.amount);
    spentByCategory[e.category] = (spentByCategory[e.category] ?? 0) + amt;
    totalSpent += amt;
    if (isFixedExpense(e)) {
      fixedByCategory[e.category] = (fixedByCategory[e.category] ?? 0) + amt;
      fixedSpent += amt;
    }
  }

  const totalBudget = budget ? Number(budget.totalBudget) : 0;
  const totalRemaining = totalBudget - totalSpent;

  const categories: FinancialCategoryState[] = (budget?.categoryBudgets ?? []).map((cb) => {
    const spent = spentByCategory[cb.category] ?? 0;
    const lim = Number(cb.limit);
    const utilization = lim > 0 ? Math.min(Math.round((spent / lim) * 100), 999) : 0;
    const status: FinancialCategoryState['status'] =
      utilization > 100 ? 'EXCEEDED' : utilization === 100 ? 'EXHAUSTED' :
      utilization >= 90 ? 'CRITICAL' : utilization >= 80 ? 'WARNING' : 'NORMAL';
    return { category: cb.category, budget: lim, spent, fixedSpent: fixedByCategory[cb.category] ?? 0, remaining: lim - spent, utilization, status };
  });

  const total = daysInMonth(m, y);
  const passed = Math.max(now.getDate(), 1);
  const remaining = Math.max(total - passed, 1);

  const upcomingObligations = obligations
    .filter((o) => t(o.dueDate) >= now.getTime())
    .map((o) => ({ id: o.id, name: o.name, amount: Number(o.amount), dueDate: o.dueDate, type: o.type }));
  const totalUpcomingAmount = upcomingObligations.reduce((s, o) => s + o.amount, 0);
  const dueThisMonthAmount = obligations.filter((o) => t(o.dueDate) <= end.getTime()).reduce((s, o) => s + Number(o.amount), 0);

  const buffer = Math.max(totalBudget * 0.10, 500);
  const safeSpendable = Math.max(totalRemaining - dueThisMonthAmount - buffer, 0);
  const safeDaily = remaining > 0 ? safeSpendable / remaining : 0;

  const u = store.user;
  return {
    userId: u.id,
    month: m,
    year: y,
    declaredMonthlyIncome: Number(u.declaredMonthlyIncome),
    totalIncomeThisMonth: incomes.reduce((s, i) => s + Number(i.amount), 0),
    cashBalance: Number(u.cashBalance),
    savingsBalance: Number(u.savingsBalance),
    emergencyFundBalance: Number(u.emergencyFundBalance),
    totalBudget,
    totalSpent,
    totalRemaining,
    overallUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    categories,
    avgDailySpending: Math.round(totalSpent / passed),
    daysPassedInMonth: passed,
    daysRemainingInMonth: remaining,
    totalDaysInMonth: total,
    upcomingObligations,
    totalUpcomingAmount,
    dueThisMonthAmount,
    fixedSpent,
    discretionarySpent: totalSpent - fixedSpent,
    safeSpendableAmount: Math.round(safeSpendable),
    safeDailySpending: Math.round(safeDaily),
    activeGoals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      progress: g.targetAmount > 0 ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0,
      remaining: Math.max(Number(g.targetAmount) - Number(g.currentAmount), 0),
    })),
    appreciation: buildAppreciation({
      monthExpenses: expenses,
      totalBudget,
      dueThisMonthAmount,
      daysPassed: passed,
      totalDays: total,
      topGoalName: goals[0]?.name ?? null,
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Forecast: 0.5 × velocity + 0.3 × 3-month average + 0.2 × 7-day trend
// ─────────────────────────────────────────────────────────────────────────────
export const runDemoForecast = (store: MockStore, state: FinancialState): ForecastResult => {
  const { month, year, totalDaysInMonth, daysPassedInMonth, totalBudget } = state;
  const sumBetween = (s: Date, e: Date, filter: (x: MockStore['expenses'][number]) => boolean = () => true) =>
    store.expenses.filter((x) => t(x.spentAt) >= s.getTime() && t(x.spentAt) <= e.getTime() && filter(x))
      .reduce((acc, x) => acc + Number(x.amount), 0);

  const history: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const { start, end } = monthBounds(month - i <= 0 ? month - i + 12 : month - i, month - i <= 0 ? year - 1 : year);
    history.push(sumBetween(start, end));
  }
  const historicalAvg = history.reduce((s, v) => s + v, 0) / history.length;

  const sevenDaysAgo = new Date(Date.now() - 7 * DAY);
  const recent7MonthlyEst = (sumBetween(sevenDaysAgo, new Date(8.64e15)) / 7) * totalDaysInMonth;

  const fixedSpent = state.fixedSpent ?? 0;
  const discretionarySpent = state.discretionarySpent ?? Math.max(state.totalSpent - fixedSpent, 0);
  const currentVelocityMonthly = fixedSpent + (discretionarySpent / daysPassedInMonth) * totalDaysInMonth;

  const projected = Math.round(0.5 * currentVelocityMonthly + 0.3 * historicalAvg + 0.2 * recent7MonthlyEst);

  const prevM = month - 1 <= 0 ? 12 : month - 1;
  const prevY = month - 1 <= 0 ? year - 1 : year;
  const { start: ps, end: pe } = monthBounds(prevM, prevY);
  const prevDiscretionary = sumBetween(ps, pe, (x) => !isFixedExpense(x));
  const prevDailyAvg = prevDiscretionary / daysInMonth(prevM, prevY);
  const curDailyAvg = daysPassedInMonth > 0 ? discretionarySpent / daysPassedInMonth : 0;
  const velocityChange = prevDailyAvg > 0 ? Math.round(((curDailyAvg - prevDailyAvg) / prevDailyAvg) * 100) : 0;

  return {
    projectedMonthlyExpense: projected,
    currentBudget: totalBudget,
    expectedExcess: projected - totalBudget,
    willExceedBudget: projected > totalBudget,
    previousAvgDailySpending: Math.round(prevDailyAvg),
    currentAvgDailySpending: Math.round(curDailyAvg),
    velocityChangePercent: velocityChange,
    categoryForecasts: state.categories.map((c) => {
      const fixed = c.fixedSpent ?? 0;
      const projectedCat = Math.round(fixed + ((c.spent - fixed) / daysPassedInMonth) * totalDaysInMonth);
      return { category: c.category, budget: c.budget, spent: c.spent, projected: projectedCat, expectedExcess: projectedCat - c.budget, willExceed: projectedCat > c.budget };
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Risk: 0.30 budget + 0.25 cash-flow + 0.20 obligation + 0.15 velocity + 0.10 goal
// ─────────────────────────────────────────────────────────────────────────────
const riskLevel = (s: number): RiskLevel => (s >= 81 ? 'CRITICAL' : s >= 61 ? 'HIGH' : s >= 31 ? 'MODERATE' : 'LOW');

export const runDemoRisk = (state: FinancialState, forecast: ForecastResult): RiskResult => {
  const alerts: string[] = [];
  const budgetRisk = clamp(state.overallUtilization * (0.4 + 0.6 * (state.daysRemainingInMonth / state.totalDaysInMonth)));
  if (budgetRisk >= 80) alerts.push('⚠️ Budget utilization is critically high for this point in the month');
  if (forecast.willExceedBudget) alerts.push(`🔴 Spending projected to exceed budget by ₹${forecast.expectedExcess.toLocaleString('en-IN')}`);

  const cashAfter = state.cashBalance - state.totalUpcomingAmount;
  let cashFlowRisk = 0;
  if (state.totalUpcomingAmount > 0) {
    if (cashAfter < 0) {
      cashFlowRisk = 100;
      alerts.push(`🔴 Cash shortfall of ₹${Math.abs(cashAfter).toLocaleString('en-IN')} — upcoming obligations may not be covered`);
    } else {
      cashFlowRisk = clamp(Math.max(0, (1 - cashAfter / state.totalUpcomingAmount / 3) * 80));
    }
  }

  const burden = state.totalBudget > 0 ? (state.totalUpcomingAmount / state.totalBudget) * 100 : 0;
  const obligationRisk = clamp(burden * 1.2);
  if (burden > 60) alerts.push('🟡 Upcoming obligations are a significant portion of the monthly budget');

  const vc = forecast.velocityChangePercent;
  const velocityRisk = vc > 0 ? clamp(Math.min(vc * 1.5, 100)) : 0;
  if (vc >= 30) alerts.push(`📈 Spending velocity increased by ${vc}% vs last month`);

  const goalRisk = state.activeGoals.length === 0 ? 0
    : clamp(forecast.expectedExcess > 0 ? Math.min((forecast.expectedExcess / Math.max(state.totalBudget, 1)) * 150, 100) : 0);
  if (goalRisk >= 50) alerts.push('🎯 Overspending may delay one or more savings goals');

  const riskScore = clamp(0.30 * budgetRisk + 0.25 * cashFlowRisk + 0.20 * obligationRisk + 0.15 * velocityRisk + 0.10 * goalRisk);
  if (alerts.length === 0) alerts.push('✅ No significant risk factors detected');

  return { riskScore, riskLevel: riskLevel(riskScore), components: { budgetRisk, cashFlowRisk, obligationRisk, velocityRisk, goalRisk }, alerts };
};

// ─────────────────────────────────────────────────────────────────────────────
// Health score (6 weighted components)
// ─────────────────────────────────────────────────────────────────────────────
export const runDemoHealth = (state: FinancialState, forecast: ForecastResult): HealthScoreResult => {
  const insights: string[] = [];
  const grade = (s: number): HealthScoreResult['grade'] => (s >= 85 ? 'EXCELLENT' : s >= 70 ? 'GOOD' : s >= 50 ? 'FAIR' : 'POOR');

  const budgetAdherence = clamp(forecast.willExceedBudget
    ? Math.max(0, 100 - (forecast.expectedExcess / Math.max(state.totalBudget, 1)) * 100)
    : 100 - Math.max(0, state.overallUtilization - 70));

  const monthsOfCash = state.avgDailySpending > 0 ? state.cashBalance / (state.avgDailySpending * 30) : 3;
  const cashBuffer = clamp(Math.min(monthsOfCash / 3, 1) * 100);
  if (monthsOfCash < 1) insights.push('⚠️ Cash balance covers less than 1 month of expenses');

  const coverage = state.totalUpcomingAmount > 0 ? state.cashBalance / state.totalUpcomingAmount : 3;
  const obligationCoverage = clamp(Math.min(coverage / 2, 1) * 100);
  if (coverage < 1.2) insights.push('⚠️ EMI or obligation coverage is thin — avoid large discretionary spends');
  if (coverage >= 2) insights.push('✅ Upcoming obligations are well covered');

  const vc = forecast.velocityChangePercent;
  const stability = clamp(vc >= 0 ? Math.max(100 - vc * 1.5, 0) : 100);
  if (vc >= 30) insights.push(`📈 Spending velocity up ${vc}% — the main drag on your health score`);
  if (vc <= -10) insights.push(`📉 Spending slowed by ${Math.abs(vc)}% vs last month`);

  const savingsRatio = state.savingsBalance / (state.declaredMonthlyIncome || 1);
  const savings = clamp(Math.min(savingsRatio / 0.2, 1) * 100);
  if (savings >= 80) insights.push('✅ Savings balance looks healthy');

  const avgGoal = state.activeGoals.length > 0 ? state.activeGoals.reduce((s, g) => s + g.progress, 0) / state.activeGoals.length : 100;
  const goalProgress = clamp(avgGoal);

  const total = clamp(0.25 * budgetAdherence + 0.20 * cashBuffer + 0.20 * obligationCoverage + 0.15 * stability + 0.10 * savings + 0.10 * goalProgress);

  const ap = state.appreciation;
  if (ap?.eligible) insights.unshift(`🎉 You're ₹${ap.savedSoFar.toLocaleString('en-IN')} under your safe-to-spend allowance this month — keep it up!`);
  if (insights.length === 0) insights.push('✅ All financial health indicators look good');

  return {
    total,
    grade: grade(total),
    components: {
      budgetAdherence: { score: budgetAdherence, explanation: forecast.willExceedBudget ? `Projected to overspend by ₹${forecast.expectedExcess.toLocaleString('en-IN')}` : `Spending within budget (${state.overallUtilization}% used)` },
      cashBuffer: { score: cashBuffer, explanation: `Cash covers ~${monthsOfCash.toFixed(1)} months of current spending` },
      obligationCoverage: { score: obligationCoverage, explanation: state.totalUpcomingAmount > 0 ? `Cash covers ${coverage.toFixed(1)}× upcoming obligations` : 'No upcoming obligations this period' },
      spendingStability: { score: stability, explanation: vc > 0 ? `Spending ${vc}% faster than last month` : vc < 0 ? `Spending ${Math.abs(vc)}% slower than last month — great` : 'Spending pace unchanged from last month' },
      savingsRate: { score: savings, explanation: `Savings balance is ${(savingsRatio * 100).toFixed(0)}% of monthly income` },
      goalProgress: { score: goalProgress, explanation: state.activeGoals.length > 0 ? `Average goal progress: ${avgGoal.toFixed(0)}%` : 'No active savings goals' },
    },
    insights,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// What-if simulation (same algorithm as simulation.service.ts)
// ─────────────────────────────────────────────────────────────────────────────
export const runDemoSimulation = (
  state: FinancialState, forecast: ForecastResult, risk: RiskResult, health: HealthScoreResult,
  input: { amount: number; category?: string; description?: string }
): SimulationResult => {
  const before = {
    riskScore: risk.riskScore, riskLevel: risk.riskLevel, healthScore: health.total, healthGrade: health.grade,
    projectedExpense: forecast.projectedMonthlyExpense, cashBalance: state.cashBalance,
    safeDaily: state.safeDailySpending, budgetRemaining: state.totalRemaining,
  };

  const sim: FinancialState = JSON.parse(JSON.stringify(state));
  sim.totalSpent += input.amount;
  sim.totalRemaining -= input.amount;
  sim.cashBalance -= input.amount;
  sim.overallUtilization = sim.totalBudget > 0 ? Math.round((sim.totalSpent / sim.totalBudget) * 100) : 0;
  const cat = input.category ? sim.categories.find((c) => c.category.toLowerCase() === input.category!.toLowerCase()) : undefined;
  if (cat) {
    cat.spent += input.amount;
    cat.remaining -= input.amount;
    cat.utilization = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0;
    cat.status = cat.utilization > 100 ? 'EXCEEDED' : cat.utilization === 100 ? 'EXHAUSTED' : cat.utilization >= 90 ? 'CRITICAL' : cat.utilization >= 80 ? 'WARNING' : 'NORMAL';
  }
  const buffer = Math.max(sim.totalBudget * 0.10, 500);
  sim.safeSpendableAmount = Math.max(sim.totalRemaining - (sim.dueThisMonthAmount ?? sim.totalUpcomingAmount) - buffer, 0);
  sim.safeDailySpending = sim.daysRemainingInMonth > 0 ? Math.round(sim.safeSpendableAmount / sim.daysRemainingInMonth) : 0;

  const simForecast: ForecastResult = {
    ...forecast,
    projectedMonthlyExpense: forecast.projectedMonthlyExpense + input.amount,
    expectedExcess: forecast.expectedExcess + input.amount,
    willExceedBudget: forecast.projectedMonthlyExpense + input.amount > forecast.currentBudget,
  };
  const budgetRisk = clamp(sim.overallUtilization * (0.4 + 0.6 * (sim.daysRemainingInMonth / sim.totalDaysInMonth)));
  const cashAfter = sim.cashBalance - sim.totalUpcomingAmount;
  const cashFlowRisk = cashAfter < 0 ? 100 : clamp(Math.max(0, (1 - cashAfter / Math.max(sim.totalUpcomingAmount, 1) / 3) * 80));
  const obligationRisk = clamp((sim.totalUpcomingAmount / Math.max(sim.totalBudget, 1)) * 120);
  const goalRisk = simForecast.expectedExcess > 0 ? clamp(Math.min((simForecast.expectedExcess / Math.max(sim.totalBudget, 1)) * 150, 100)) : 0;
  const simRiskScore = clamp(0.30 * budgetRisk + 0.25 * cashFlowRisk + 0.20 * obligationRisk + 0.15 * risk.components.velocityRisk + 0.10 * goalRisk);
  const simHealth = runDemoHealth(sim, simForecast);

  const after = {
    riskScore: simRiskScore, riskLevel: riskLevel(simRiskScore), healthScore: simHealth.total, healthGrade: simHealth.grade,
    projectedExpense: simForecast.projectedMonthlyExpense, cashBalance: sim.cashBalance,
    safeDaily: sim.safeDailySpending, budgetRemaining: sim.totalRemaining,
  };
  const diff = {
    riskDelta: after.riskScore - before.riskScore,
    healthDelta: after.healthScore - before.healthScore,
    cashImpact: after.cashBalance - before.cashBalance,
    budgetImpact: after.budgetRemaining - before.budgetRemaining,
    projectedImpact: after.projectedExpense - before.projectedExpense,
  };
  const verdict =
    after.cashBalance < 0 ? 'This purchase would put your cash balance negative. Avoid it until you have more cash.'
    : after.cashBalance < sim.totalUpcomingAmount ? `After this purchase, your cash (₹${after.cashBalance.toLocaleString('en-IN')}) would be less than your upcoming obligations (₹${sim.totalUpcomingAmount.toLocaleString('en-IN')}). Risky.`
    : diff.riskDelta > 20 ? `This would significantly increase your risk score by ${diff.riskDelta} points (${after.riskLevel}). Consider waiting.`
    : diff.riskDelta > 10 ? `Manageable, but your risk score rises by ${diff.riskDelta} points. Keep other spending tight this month.`
    : `This purchase looks safe. Risk only increases by ${diff.riskDelta} points and you can still cover your obligations.`;

  return { input, before, after, diff, verdict, safe: after.riskScore < 60 && after.cashBalance > sim.totalUpcomingAmount };
};

// ─────────────────────────────────────────────────────────────────────────────
// Dependency graph (same nodes/edges as dependency.service.ts)
// ─────────────────────────────────────────────────────────────────────────────
export const buildDemoGraph = (state: FinancialState, riskScore: number): DependencyGraph => {
  const nodes: GraphNode[] = [
    { id: 'n-income', type: 'INCOME', label: 'Income', value: state.totalIncomeThisMonth || state.declaredMonthlyIncome, position: { x: 0, y: 0 } },
    { id: 'n-cash', type: 'CASH', label: 'Cash Balance', value: state.cashBalance, position: { x: 300, y: 0 } },
    { id: 'n-budget', type: 'BUDGET', label: 'Monthly Budget', value: state.totalBudget, position: { x: 300, y: 150 } },
    { id: 'n-expenses', type: 'EXPENSES', label: 'Monthly Expenses', value: state.totalSpent, position: { x: 600, y: 150 } },
    { id: 'n-savings', type: 'SAVINGS', label: 'Savings', value: state.savingsBalance, position: { x: 600, y: -150 } },
    { id: 'n-risk', type: 'RISK', label: 'Risk', value: riskScore, position: { x: 900, y: 0 } },
  ];
  const edges: GraphEdge[] = [
    { id: 'e-1', source: 'n-income', target: 'n-cash', relationship: 'deposits_into', weight: 1, severity: 'CRITICAL' },
    { id: 'e-2', source: 'n-cash', target: 'n-budget', relationship: 'funds', weight: 1, severity: 'HIGH' },
    { id: 'e-3', source: 'n-budget', target: 'n-expenses', relationship: 'allocates_to', weight: 1, severity: 'MEDIUM' },
    { id: 'e-4', source: 'n-expenses', target: 'n-cash', relationship: 'reduces', weight: 1, severity: 'HIGH' },
    { id: 'e-5', source: 'n-cash', target: 'n-savings', relationship: 'transfers_to', weight: 0.2, severity: 'LOW' },
    { id: 'e-6', source: 'n-expenses', target: 'n-risk', relationship: 'increases', weight: 0.3, severity: 'MEDIUM' },
  ];
  let yOff = -100;
  state.upcomingObligations.slice(0, 5).forEach((o, i) => {
    const id = `n-ob-${i}`;
    nodes.push({ id, type: o.type === 'EMI' ? 'EMI' : o.type === 'RENT' ? 'RENT' : 'BUFFER', label: o.name, value: o.amount, position: { x: 600, y: yOff } });
    yOff += 100;
    const w = state.cashBalance > 0 ? o.amount / state.cashBalance : 1;
    const severity: GraphEdge['severity'] = w > 0.4 ? 'CRITICAL' : w > 0.2 ? 'HIGH' : 'MEDIUM';
    edges.push({ id: `e-ob-${i}-a`, source: 'n-cash', target: id, relationship: 'funds', weight: w, severity });
    edges.push({ id: `e-ob-${i}-b`, source: id, target: 'n-risk', relationship: 'increases', weight: Math.min(w * 1.5, 1), severity });
  });
  return { nodes, edges };
};

// ─────────────────────────────────────────────────────────────────────────────
// Goals with plan + contribution history (mirrors goals.service serialize)
// ─────────────────────────────────────────────────────────────────────────────
export const serializeDemoGoal = (store: MockStore, goal: Goal, flatRate: number | null = null): Goal => {
  const contributions = store.goalContributions
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => t(b.contributedAt) - t(a.contributedAt))
    .slice(0, 24);
  return {
    ...goal,
    contributions,
    plan: buildGoalPlan({
      ...goal,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      priority: goal.priority ?? 'MEDIUM',
      contributions,
    }, { flatRate }),
  };
};

export const listDemoGoals = (store: MockStore, flatRate: number | null = null) =>
  [...store.goals]
    .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'MEDIUM'] - PRIORITY_ORDER[b.priority ?? 'MEDIUM'] || t(a.createdAt) - t(b.createdAt))
    .map((g) => serializeDemoGoal(store, g, flatRate));

// ─────────────────────────────────────────────────────────────────────────────
// Planning snapshot (mirrors planning.service.ts)
// ─────────────────────────────────────────────────────────────────────────────
export const buildDemoPlanning = (
  store: MockStore, state: FinancialState, forecast: ForecastResult,
  opts: { inflationRate?: number | null; inflationEnabled?: boolean } = {}
): PlanningSnapshot => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
  const flatRate = opts.inflationRate != null && Number.isFinite(opts.inflationRate) ? opts.inflationRate : null;

  const goalPlans = sortGoals(store.goals.filter((g) => g.status === 'ACTIVE' || g.status === 'COMPLETED')).map((g) =>
    buildGoalPlan({
      ...g,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      priority: g.priority ?? 'MEDIUM',
      contributions: store.goalContributions.filter((c) => c.goalId === g.id && t(c.contributedAt) >= sixMonthsAgo),
    }, { flatRate, inflationEnabled: opts.inflationEnabled ?? true, now }));

  const monthlyIncome = Math.max(state.totalIncomeThisMonth, state.declaredMonthlyIncome);
  const expectedMonthlySpend = Math.max(forecast.projectedMonthlyExpense, state.totalSpent);
  const dueThisMonth = state.dueThisMonthAmount ?? 0;
  const monthlySavingsCapacity = Math.max(Math.round(monthlyIncome - expectedMonthlySpend - dueThisMonth), 0);

  return {
    inflationRate: flatRate,
    monthlyIncome,
    expectedMonthlySpend,
    dueThisMonth,
    monthlySavingsCapacity,
    goalPlans,
    savingsPlan: buildSavingsPlan(goalPlans.filter((p) => p.status !== 'COMPLETED'), monthlySavingsCapacity, now),
    yearlyProjection: buildYearlyProjection(
      store.expenses.filter((e) => t(e.spentAt) >= sixMonthsAgo),
      { flatRate, now, daysPassed: state.daysPassedInMonth, totalDays: state.totalDaysInMonth }
    ),
    appreciation: state.appreciation ?? null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Budget enrichment for GET /budgets/current (mirrors budgets.service)
// ─────────────────────────────────────────────────────────────────────────────
export const enrichDemoBudget = (store: MockStore, budget: Budget) => {
  const { start, end } = monthBounds(budget.month, budget.year);
  const spentBy: Record<string, number> = {};
  let totalSpent = 0;
  for (const e of store.expenses) {
    if (t(e.spentAt) < start.getTime() || t(e.spentAt) > end.getTime()) continue;
    spentBy[e.category] = (spentBy[e.category] ?? 0) + Number(e.amount);
    totalSpent += Number(e.amount);
  }
  const categories = budget.categoryBudgets.map((cb) => {
    const spent = spentBy[cb.category] ?? 0;
    const limit = Number(cb.limit);
    const utilization = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const status = utilization > 100 ? 'EXCEEDED' : utilization === 100 ? 'EXHAUSTED' : utilization >= 90 ? 'CRITICAL' : utilization >= 80 ? 'WARNING' : 'NORMAL';
    return { ...cb, limit, spent, remaining: limit - spent, utilization, status };
  });
  const total = Number(budget.totalBudget);
  return {
    ...budget,
    totalBudget: total,
    totalSpent,
    totalRemaining: total - totalSpent,
    overallUtilization: total > 0 ? Math.round((totalSpent / total) * 100) : 0,
    categories,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Anomalies (z-score > 2 per category, last 3 months)
// ─────────────────────────────────────────────────────────────────────────────
export const getDemoAnomalies = (store: MockStore) => {
  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const recent = store.expenses.filter((e) => t(e.spentAt) >= since.getTime());
  const byCat: Record<string, number[]> = {};
  for (const e of recent) (byCat[e.category] ??= []).push(Number(e.amount));
  const anomalies: { expense: MockStore['expenses'][number]; zscore: number; categoryMean: number; categoryStd: number }[] = [];
  for (const [category, amounts] of Object.entries(byCat)) {
    if (amounts.length < 3) continue;
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const std = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
    if (std === 0) continue;
    for (const e of recent.filter((x) => x.category === category)) {
      const z = (Number(e.amount) - mean) / std;
      if (z > 2) anomalies.push({ expense: e, zscore: Math.round(z * 100) / 100, categoryMean: Math.round(mean), categoryStd: Math.round(std) });
    }
  }
  return { count: anomalies.length, anomalies: anomalies.sort((a, b) => b.zscore - a.zscore) };
};

// ─────────────────────────────────────────────────────────────────────────────
// Rule-based advisor (mirrors buildRuleBasedAdvice in ai.service.ts)
// ─────────────────────────────────────────────────────────────────────────────
export const buildDemoAdvice = (
  state: FinancialState, forecast: ForecastResult, risk: RiskResult, health: HealthScoreResult,
  planning: PlanningSnapshot, userPrompt?: string
): AIRecommendation => {
  const q = (userPrompt ?? '').toLowerCase();
  const insights: AIInsight[] = [];
  const plans = planning.goalPlans.filter((p) => p.status !== 'COMPLETED');
  const sp = planning.savingsPlan;
  const ap = planning.appreciation;

  for (const a of sp.allocations.slice(0, 3)) {
    const p = plans.find((x) => x.goalId === a.goalId);
    if (!p) continue;
    if (p.requiredMonthly == null) {
      insights.push({ title: `Plan a date for ${p.name}`, detail: p.advice, category: 'GOAL', amount: p.monthlyPace || null });
      continue;
    }
    const later = a.shortfall > 0 && a.suggestedDeadline
      ? ` With your current capacity you can put ${inr(a.allocated)}/month here, which reaches it by ${monthLabel(a.suggestedDeadline)}.`
      : '';
    insights.push({ title: `Save ${inr(p.requiredMonthly)}/month for ${p.name}`, detail: p.advice + later, category: 'GOAL', amount: p.requiredMonthly });
  }

  if (sp.allocations.length > 0) {
    insights.push({
      title: sp.shortfall > 0 ? 'Close your goal funding gap' : 'All goals fit your budget',
      detail: sp.summary, category: 'SAVING',
      amount: sp.shortfall > 0 ? sp.shortfall : planning.monthlySavingsCapacity,
    });
  }

  if (ap?.eligible) insights.push({ title: ap.title, detail: `${ap.message} ${ap.suggestion ?? ''}`.trim(), category: 'APPRECIATION', amount: ap.savedSoFar });
  else if (ap?.level === 'OVER') insights.push({ title: 'Slow down day-to-day spending', detail: ap.message, category: 'SPENDING', amount: null });

  const y = planning.yearlyProjection;
  const next = y.projections.find((p) => p.years === 1);
  const five = y.projections.find((p) => p.years === 5);
  if (y.annualBaseline > 0 && next && five) {
    insights.push({
      title: `Inflation adds ${inr(next.increase)} to next year`,
      detail: `Your yearly living cost of ${inr(y.annualBaseline)} becomes ${inr(next.annual)} next year and ${inr(five.annual)} in 5 years at a blended ${y.blendedRate}% inflation. ` +
        `Raise your monthly savings by about ${inr(next.increase / 12)} each year and keep long-term goal money in inflation-beating options (index funds, PPF) rather than a savings account.`,
      category: 'INFLATION', amount: next.increase,
    });
  }

  const top = forecast.categoryForecasts.filter((c) => c.willExceed).sort((a, b) => b.expectedExcess - a.expectedExcess)[0];
  if (top) {
    insights.push({
      title: `Rein in ${top.category.toLowerCase()} spending`,
      detail: `${top.category} is projected at ${inr(top.projected)} against a ${inr(top.budget)} limit (over by ${inr(top.expectedExcess)}). Trim it for the rest of the month to protect your goal savings.`,
      category: 'SPENDING', amount: top.expectedExcess,
    });
  } else if (forecast.willExceedBudget) {
    insights.push({ title: 'Total spending is trending over budget', detail: `Projected month-end spend is ${inr(forecast.projectedMonthlyExpense)}, ${inr(forecast.expectedExcess)} over budget. Review discretionary purchases.`, category: 'SPENDING', amount: forecast.expectedExcess });
  }

  if (state.totalUpcomingAmount > 0 && state.cashBalance < state.totalUpcomingAmount * 1.2) {
    insights.push({
      title: 'Protect cash for upcoming bills',
      detail: `Upcoming obligations of ${inr(state.totalUpcomingAmount)} are close to your cash balance of ${inr(state.cashBalance)}. Avoid large non-essential purchases until they are paid.`,
      category: 'RISK', amount: state.totalUpcomingAmount,
    });
  }

  const focus: InsightCategory[] =
    /inflation|price|future cost/.test(q) ? ['INFLATION', 'GOAL'] :
    /appreciat|how am i|doing|discipline|safe/.test(q) ? ['APPRECIATION', 'SPENDING'] :
    /risk|emi|loan|obligation|bill/.test(q) ? ['RISK', 'SPENDING'] :
    /food|budget|spend|overspend|shopping/.test(q) ? ['SPENDING', 'APPRECIATION'] :
    /goal|save|saving|allocate|priorit|vacation|trip/.test(q) ? ['GOAL', 'SAVING'] : [];
  const rank = (c: InsightCategory) => { const i = focus.indexOf(c); return i < 0 ? focus.length : i; };
  const ordered = insights
    .map((ins, idx) => ({ ins, idx }))
    .sort((a, b) => rank(a.ins.category) - rank(b.ins.category) || a.idx - b.idx)
    .map((x) => x.ins)
    .slice(0, 6);
  if (ordered.length === 0) {
    ordered.push({ title: 'Start with a budget and a goal', detail: 'Add a monthly budget and at least one savings goal so WealthMap can build a personalised plan for you.', category: 'SAVING', amount: null });
  }

  const goalTotal = sp.allocations.reduce((s, a) => s + a.allocated, 0);
  const summary = [
    ap?.eligible ? `You're ${inr(ap.savedSoFar)} under your safe-to-spend this month — well done.` : '',
    goalTotal > 0 ? `Put ${inr(goalTotal)}/month towards your goals${sp.shortfall > 0 ? `, and find ${inr(sp.shortfall)} more to hit every deadline` : ''}.` : '',
    y.annualBaseline > 0 ? `Plan for ${y.blendedRate}% yearly inflation on your living costs.` : '',
  ].filter(Boolean).join(' ') || 'Here is your personalised financial plan.';

  return {
    summary,
    insights: ordered,
    recommendations: ordered.map((i) => `${i.title} — ${i.detail}`),
    source: 'rules',
    model: null,
    fallbackReason: 'Demo mode runs offline, so the built-in advisor is used',
    goalPlans: planning.goalPlans.filter((g) => g.status !== 'COMPLETED'),
    savingsPlan: planning.savingsPlan,
    appreciation: planning.appreciation,
    yearly: { annualBaseline: y.annualBaseline, nextYear: next?.annual ?? 0, blendedRate: y.blendedRate },
    context: {
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      healthScore: health.total,
      healthGrade: health.grade,
      willExceedBudget: forecast.willExceedBudget,
      monthlySavingsCapacity: planning.monthlySavingsCapacity,
    },
  };
};
