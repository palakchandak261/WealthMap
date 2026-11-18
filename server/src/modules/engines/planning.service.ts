/**
 * Planning Engine
 * ────────────────
 * Turns the financial state into a forward-looking plan:
 *   • Goal plans        — inflation-adjusted targets + "save ₹X/month" per goal
 *   • Savings plan      — allocates monthly savings capacity across goals by priority
 *   • Yearly projection — category-weighted inflation of the user's living costs
 *   • Appreciation      — safe-to-spend discipline feedback (from FinancialState)
 */

import prisma from "../../lib/prisma";
import { FinancialState } from "./financialState.service";
import { ForecastResult } from "./forecasting.service";
import {
  buildGoalPlan, buildSavingsPlan, buildYearlyProjection,
  GoalPlan, SavingsPlan, YearlyProjection, SpendingAppreciation,
} from "../../lib/finance";

export interface PlanningSnapshot {
  inflationRate: number | null;      // flat override, null = category-based rates
  monthlyIncome: number;
  expectedMonthlySpend: number;
  dueThisMonth: number;
  monthlySavingsCapacity: number;
  goalPlans: GoalPlan[];
  savingsPlan: SavingsPlan;
  yearlyProjection: YearlyProjection;
  appreciation: SpendingAppreciation | null;
}

/** Monthly amount the user can realistically put towards goals. */
export const computeSavingsCapacity = (state: FinancialState, forecast: ForecastResult) => {
  const monthlyIncome = Math.max(state.totalIncomeThisMonth, state.declaredMonthlyIncome);
  const expectedMonthlySpend = Math.max(forecast.projectedMonthlyExpense, state.totalSpent);
  const dueThisMonth = state.dueThisMonthAmount ?? 0;
  return {
    monthlyIncome,
    expectedMonthlySpend,
    dueThisMonth,
    monthlySavingsCapacity: Math.max(Math.round(monthlyIncome - expectedMonthlySpend - dueThisMonth), 0),
  };
};

export const buildPlanningSnapshot = async (
  userId: string,
  state: FinancialState,
  forecast: ForecastResult,
  opts: { inflationRate?: number | null; inflationEnabled?: boolean } = {}
): Promise<PlanningSnapshot> => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const flatRate = opts.inflationRate != null && Number.isFinite(opts.inflationRate) ? opts.inflationRate : null;

  const [goals, expenses] = await Promise.all([
    prisma.goal.findMany({
      where: { userId },
      include: { contributions: { where: { contributedAt: { gte: sixMonthsAgo } }, orderBy: { contributedAt: "desc" } } },
      orderBy: [{ priority: "asc" }, { deadline: "asc" }],
    }),
    prisma.expense.findMany({
      where: { userId, spentAt: { gte: sixMonthsAgo } },
      select: { category: true, amount: true, spentAt: true, isRecurring: true },
    }),
  ]);

  const goalPlans = goals
    .filter((g) => g.status === "ACTIVE" || g.status === "COMPLETED")
    .map((g) => buildGoalPlan({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      deadline: g.deadline,
      status: g.status,
      category: g.category,
      priority: g.priority,
      inflationRate: g.inflationRate != null ? Number(g.inflationRate) : null,
      createdAt: g.createdAt,
      contributions: g.contributions.map((c) => ({ amount: Number(c.amount), contributedAt: c.contributedAt })),
    }, { flatRate, inflationEnabled: opts.inflationEnabled ?? true, now }));

  const capacity = computeSavingsCapacity(state, forecast);

  return {
    inflationRate: flatRate,
    ...capacity,
    goalPlans,
    savingsPlan: buildSavingsPlan(goalPlans.filter((p) => p.status !== "COMPLETED"), capacity.monthlySavingsCapacity, now),
    yearlyProjection: buildYearlyProjection(
      expenses.map((e) => ({ category: e.category, amount: Number(e.amount), spentAt: e.spentAt, isRecurring: e.isRecurring })),
      { flatRate, now, daysPassed: state.daysPassedInMonth, totalDays: state.totalDaysInMonth }
    ),
    appreciation: state.appreciation ?? null,
  };
};
