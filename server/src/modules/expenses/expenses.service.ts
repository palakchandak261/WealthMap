import prisma from "../../lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { monthRange } from "../../lib/dateHelpers";

const notFound = () => Object.assign(new Error("Expense not found"), { statusCode: 404, code: "NOT_FOUND" });

// ── Create ────────────────────────────────────────────────────────────────────
export const createExpenseService = async (
  userId: string,
  body: {
    category: string;
    amount: number;
    description?: string;
    paymentMethod?: PaymentMethod;
    isRecurring?: boolean;
    spentAt: string;
  }
) => {
  return prisma.expense.create({
    data: {
      userId,
      category:      body.category,
      amount:        body.amount,
      description:   body.description,
      paymentMethod: body.paymentMethod  ?? "OTHER",
      isRecurring:   body.isRecurring    ?? false,
      spentAt:       new Date(body.spentAt),
    },
  });
};

// ── List with optional filters ────────────────────────────────────────────────
export const getExpensesService = async (
  userId: string,
  filters: { month?: number; year?: number; category?: string }
) => {
  const where: Record<string, unknown> = { userId };

  if (filters.month && filters.year) {
    const { start, end } = monthRange(filters.month, filters.year);
    where["spentAt"] = { gte: start, lte: end };
  }
  if (filters.category) where["category"] = filters.category;

  return prisma.expense.findMany({ where, orderBy: { spentAt: "desc" } });
};

// ── Single ────────────────────────────────────────────────────────────────────
export const getExpenseByIdService = async (userId: string, id: string) => {
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) throw notFound();
  return expense;
};

// ── Update ────────────────────────────────────────────────────────────────────
export const updateExpenseService = async (
  userId: string,
  id: string,
  body: Partial<{ category: string; amount: number; description: string; paymentMethod: PaymentMethod; isRecurring: boolean; spentAt: string }>
) => {
  await getExpenseByIdService(userId, id);
  return prisma.expense.update({
    where: { id },
    data: { ...body, ...(body.spentAt && { spentAt: new Date(body.spentAt) }) },
  });
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteExpenseService = async (userId: string, id: string) => {
  await getExpenseByIdService(userId, id);
  await prisma.expense.delete({ where: { id } });
};

// ── Day-wise timeline ─────────────────────────────────────────────────────────
// Groups expenses by date so the dashboard can render the timeline view
export const getDailyTimelineService = async (userId: string, month: number, year: number) => {
  const expenses = await getExpensesService(userId, { month, year });

  // Group by YYYY-MM-DD key
  const map = new Map<string, { date: string; items: typeof expenses; total: number }>();

  for (const exp of expenses) {
    const key = exp.spentAt.toISOString().split("T")[0];
    if (!map.has(key)) map.set(key, { date: key, items: [], total: 0 });
    const day = map.get(key)!;
    day.items.push(exp);
    day.total += Number(exp.amount);
  }

  // Return newest day first
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
};
