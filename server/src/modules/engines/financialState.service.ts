/**
 * Financial State Engine
 * ──────────────────────
 * Builds the complete "Digital Twin" snapshot of a user's finances.
 * Every other engine reads from this — never directly from the DB.
 *
 * Shape: FinancialState
 */

import prisma from "../../lib/prisma";
import { monthRange, daysInMonth, daysPassed, daysRemaining } from "../../lib/dateHelpers";
import { buildAppreciation, isFixedExpense, SpendingAppreciation } from "../../lib/finance";

export interface CategoryState {
  category:    string;
  budget:      number;
  spent:       number;
  fixedSpent?: number;  // rent / EMI / recurring part of `spent` (not extrapolated)
  remaining:   number;
  utilization: number; // 0-100
  status:      "NORMAL" | "WARNING" | "CRITICAL" | "EXHAUSTED" | "EXCEEDED";
}

export interface FinancialState {
  userId:               string;
  month:                number;
  year:                 number;
  // Income
  declaredMonthlyIncome: number;
  totalIncomeThisMonth:  number;
  // Cash & savings
  cashBalance:          number;
  savingsBalance:       number;
  emergencyFundBalance: number;
  // Budget
  totalBudget:          number;
  totalSpent:           number;
  totalRemaining:       number;
  overallUtilization:   number;
  categories:           CategoryState[];
  // Spending velocity
  avgDailySpending:     number;         // totalSpent / daysPassed
  daysPassedInMonth:    number;
  daysRemainingInMonth: number;
  totalDaysInMonth:     number;
  // Upcoming obligations (unpaid, due within 30 days)
  upcomingObligations:  { id: string; name: string; amount: number; dueDate: Date; type: string }[];
  totalUpcomingAmount:  number;
  dueThisMonthAmount?:  number;         // unpaid obligations due before month end (incl. overdue this month)
  // Fixed commitments vs day-to-day spending
  fixedSpent?:          number;
  discretionarySpent?:  number;
  // Safe to spend
  safeSpendableAmount:  number;         // remaining − obligations due this month − buffer
  safeDailySpending:    number;         // safeSpendable / daysRemaining
  // Goals summary
  activeGoals:          { id: string; name: string; progress: number; remaining: number }[];
  // Positive reinforcement when spending stays under safe-to-spend
  appreciation?:        SpendingAppreciation;
}

export const buildFinancialState = async (
  userId: string,
  month?: number,
  year?:  number
): Promise<FinancialState> => {
  const now   = new Date();
  const m     = month ?? now.getMonth() + 1;
  const y     = year  ?? now.getFullYear();
  const { start, end } = monthRange(m, y);

  // ── Load everything in parallel ─────────────────────────────────────────────
  const [user, budget, expenses, obligations, goals, incomes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.budget.findUnique({
      where:   { userId_month_year: { userId, month: m, year: y } },
      include: { categoryBudgets: true },
    }),
    prisma.expense.findMany({ where: { userId, spentAt: { gte: start, lte: end } } }),
    prisma.obligation.findMany({
      where: {
        userId,
        isPaid:  false,
        // From the start of this month (catches overdue ones) up to 30 days ahead
        dueDate: { gte: start < now ? start : now, lte: new Date(now.getTime() + 30 * 86400_000) },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: [{ priority: "asc" }, { deadline: "asc" }] }),
    prisma.income.findMany({ where: { userId, receivedAt: { gte: start, lte: end } } }),
  ]);

  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });

  // ── Aggregate expenses ───────────────────────────────────────────────────────
  const spentByCategory: Record<string, number> = {};
  const fixedByCategory: Record<string, number> = {};
  let totalSpent = 0;
  let fixedSpent = 0;
  for (const exp of expenses) {
    const amt = Number(exp.amount);
    spentByCategory[exp.category] = (spentByCategory[exp.category] ?? 0) + amt;
    totalSpent += amt;
    if (isFixedExpense(exp)) {
      fixedByCategory[exp.category] = (fixedByCategory[exp.category] ?? 0) + amt;
      fixedSpent += amt;
    }
  }

  const totalBudget = budget ? Number(budget.totalBudget) : 0;
  const totalRemaining = totalBudget - totalSpent;

  // ── Per-category status ──────────────────────────────────────────────────────
  const categories: CategoryState[] = (budget?.categoryBudgets ?? []).map((cb) => {
    const spent       = spentByCategory[cb.category] ?? 0;
    const lim         = Number(cb.limit);
    const remaining   = lim - spent;
    const utilization = lim > 0 ? Math.min(Math.round((spent / lim) * 100), 999) : 0;

    const status: CategoryState["status"] =
      utilization > 100 ? "EXCEEDED"  :
      utilization === 100 ? "EXHAUSTED" :
      utilization >= 90   ? "CRITICAL"  :
      utilization >= 80   ? "WARNING"   : "NORMAL";

    return { category: cb.category, budget: lim, spent, fixedSpent: fixedByCategory[cb.category] ?? 0, remaining, utilization, status };
  });

  // ── Velocity ─────────────────────────────────────────────────────────────────
  const passed    = daysPassed(m, y);
  const remaining = daysRemaining(m, y);
  const total     = daysInMonth(m, y);
  const avgDaily  = passed > 0 ? totalSpent / passed : 0;

  // ── Obligations ──────────────────────────────────────────────────────────────
  const toObligation = (o: (typeof obligations)[number]) => ({
    id:      o.id,
    name:    o.name,
    amount:  Number(o.amount),
    dueDate: o.dueDate,
    type:    o.type,
  });
  // Upcoming = due from now to +30 days (used for cash-flow risk & alerts)
  const upcomingObligations = obligations.filter((o) => o.dueDate >= now).map(toObligation);
  const totalUpcomingAmount = upcomingObligations.reduce((s, o) => s + o.amount, 0);
  // Due this month = must be paid out of THIS month's budget (next month's rent is not)
  const dueThisMonthAmount = obligations
    .filter((o) => o.dueDate <= end)
    .reduce((s, o) => s + Number(o.amount), 0);

  // ── Safe to spend ────────────────────────────────────────────────────────────
  // Buffer = 10% of totalBudget (minimum ₹500)
  const buffer          = Math.max(totalBudget * 0.10, 500);
  const safeSpendable   = Math.max(totalRemaining - dueThisMonthAmount - buffer, 0);
  const safeDaily       = remaining > 0 ? safeSpendable / remaining : 0;

  // ── Goals ────────────────────────────────────────────────────────────────────
  const activeGoals = goals.map((g) => {
    const tgt  = Number(g.targetAmount);
    const cur  = Number(g.currentAmount);
    return {
      id:        g.id,
      name:      g.name,
      progress:  tgt > 0 ? Math.round((cur / tgt) * 100) : 0,
      remaining: Math.max(tgt - cur, 0),
    };
  });

  // ── Total income this month ──────────────────────────────────────────────────
  const totalIncomeThisMonth = incomes.reduce((s, i) => s + Number(i.amount), 0);

  return {
    userId,
    month:                m,
    year:                 y,
    declaredMonthlyIncome: Number(user.declaredMonthlyIncome),
    totalIncomeThisMonth,
    cashBalance:          Number(user.cashBalance),
    savingsBalance:       Number(user.savingsBalance),
    emergencyFundBalance: Number(user.emergencyFundBalance),
    totalBudget,
    totalSpent,
    totalRemaining,
    overallUtilization:   totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    categories,
    avgDailySpending:     Math.round(avgDaily),
    daysPassedInMonth:    passed,
    daysRemainingInMonth: remaining,
    totalDaysInMonth:     total,
    upcomingObligations,
    totalUpcomingAmount,
    dueThisMonthAmount,
    fixedSpent,
    discretionarySpent:   totalSpent - fixedSpent,
    safeSpendableAmount:  Math.round(safeSpendable),
    safeDailySpending:    Math.round(safeDaily),
    activeGoals,
    appreciation: buildAppreciation({
      monthExpenses: expenses.map((e) => ({ category: e.category, amount: Number(e.amount), spentAt: e.spentAt, isRecurring: e.isRecurring })),
      totalBudget,
      dueThisMonthAmount,
      daysPassed:  passed,
      totalDays:   total,
      topGoalName: goals[0]?.name ?? null,
    }),
  };
};
