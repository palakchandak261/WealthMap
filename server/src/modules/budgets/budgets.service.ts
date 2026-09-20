import prisma from "../../lib/prisma";
import { monthRange } from "../../lib/dateHelpers";

const notFound = () =>
  Object.assign(new Error("Budget not found"), { statusCode: 404, code: "NOT_FOUND" });

export interface CategoryBudgetInput {
  category: string;
  limit: number;
}

// ── Create a monthly budget with per-category limits ─────────────────────────
export const createBudgetService = async (
  userId: string,
  body: {
    month: number;
    year: number;
    totalBudget: number;
    categoryBudgets: CategoryBudgetInput[];
  }
) => {
  // Upsert the budget row (unique on userId + month + year)
  const budget = await prisma.budget.upsert({
    where: { userId_month_year: { userId, month: body.month, year: body.year } },
    create: {
      userId,
      month:       body.month,
      year:        body.year,
      totalBudget: body.totalBudget,
    },
    update: { totalBudget: body.totalBudget },
  });

  // Rebuild category budgets: delete old ones, insert new ones
  await prisma.categoryBudget.deleteMany({ where: { budgetId: budget.id } });

  await prisma.categoryBudget.createMany({
    data: body.categoryBudgets.map((cb) => ({
      budgetId: budget.id,
      category: cb.category,
      limit:    cb.limit,
    })),
  });

  return getBudgetByIdService(userId, budget.id);
};

// ── Get the budget for the current calendar month ────────────────────────────
export const getCurrentBudgetService = async (userId: string) => {
  const now = new Date();
  return getBudgetForMonthService(userId, now.getMonth() + 1, now.getFullYear());
};

// ── Get budget for a specific month, enriched with actual spending ────────────
export const getBudgetForMonthService = async (
  userId: string,
  month: number,
  year: number
) => {
  const budget = await prisma.budget.findUnique({
    where: { userId_month_year: { userId, month, year } },
    include: { categoryBudgets: true },
  });

  if (!budget) return null;

  // Sum actual expenses for this month, grouped by category
  const { start, end } = monthRange(month, year);
  const expenses = await prisma.expense.findMany({
    where: { userId, spentAt: { gte: start, lte: end } },
    select: { category: true, amount: true },
  });

  const spentByCategory: Record<string, number> = {};
  let totalSpent = 0;
  for (const exp of expenses) {
    spentByCategory[exp.category] = (spentByCategory[exp.category] ?? 0) + Number(exp.amount);
    totalSpent += Number(exp.amount);
  }

  // Enrich each category with spent / remaining / utilization / status
  const categories = budget.categoryBudgets.map((cb) => {
    const spent       = spentByCategory[cb.category] ?? 0;
    const limit       = Number(cb.limit);
    const remaining   = limit - spent;
    const utilization = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    const status =
      utilization > 100 ? "EXCEEDED"  :
      utilization === 100 ? "EXHAUSTED" :
      utilization >= 90   ? "CRITICAL"  :
      utilization >= 80   ? "WARNING"   : "NORMAL";

    return { ...cb, limit, spent, remaining, utilization, status };
  });

  return {
    ...budget,
    totalBudget: Number(budget.totalBudget),
    totalSpent,
    totalRemaining: Number(budget.totalBudget) - totalSpent,
    overallUtilization: Number(budget.totalBudget) > 0
      ? Math.round((totalSpent / Number(budget.totalBudget)) * 100)
      : 0,
    categories,
  };
};

// ── Get single budget by id ───────────────────────────────────────────────────
export const getBudgetByIdService = async (userId: string, id: string) => {
  const budget = await prisma.budget.findFirst({
    where: { id, userId },
    include: { categoryBudgets: true },
  });
  if (!budget) throw notFound();
  return budget;
};

// ── Update total budget ───────────────────────────────────────────────────────
export const updateBudgetService = async (
  userId: string,
  id: string,
  body: { totalBudget?: number; categoryBudgets?: CategoryBudgetInput[] }
) => {
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();

  if (body.totalBudget !== undefined) {
    await prisma.budget.update({ where: { id }, data: { totalBudget: body.totalBudget } });
  }

  if (body.categoryBudgets) {
    await prisma.categoryBudget.deleteMany({ where: { budgetId: id } });
    await prisma.categoryBudget.createMany({
      data: body.categoryBudgets.map((cb) => ({ budgetId: id, category: cb.category, limit: cb.limit })),
    });
  }

  return getBudgetByIdService(userId, id);
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteBudgetService = async (userId: string, id: string) => {
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();
  await prisma.budget.delete({ where: { id } });
};
