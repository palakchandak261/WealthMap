import prisma from "../../lib/prisma";
import { GoalStatus } from "@prisma/client";

const notFound = () =>
  Object.assign(new Error("Goal not found"), { statusCode: 404, code: "NOT_FOUND" });

// ── Create ────────────────────────────────────────────────────────────────────
export const createGoalService = async (
  userId: string,
  body: { name: string; targetAmount: number; currentAmount?: number; deadline?: string }
) => {
  return prisma.goal.create({
    data: {
      userId,
      name:          body.name,
      targetAmount:  body.targetAmount,
      currentAmount: body.currentAmount ?? 0,
      deadline:      body.deadline ? new Date(body.deadline) : undefined,
    },
  });
};

// ── List all active goals with inflation calculations & actionable advice ────
export const getGoalsService = async (userId: string, options?: { inflationRate?: number }) => {
  const inflationRate = options?.inflationRate ?? 6;
  const now = new Date();

  const goals = await prisma.goal.findMany({
    where:   { userId },
    orderBy: { createdAt: "asc" },
  });

  return goals.map((g) => {
    const target   = Number(g.targetAmount);
    const current  = Number(g.currentAmount);
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;
    const remaining = Math.max(target - current, 0);

    let yearsLeft = 1;
    let monthsLeft = 12;
    let inflationAdjustedTarget = target;
    let inflationCost = 0;
    let requiredMonthlySaving: number | null = null;
    let requiredMonthlySavingWithInflation: number | null = null;
    let advice = "";

    if (g.deadline && remaining > 0) {
      const diffMs = g.deadline.getTime() - now.getTime();
      yearsLeft = Math.max(diffMs / (365.25 * 86400_000), 0.08);
      monthsLeft = Math.max(
        (g.deadline.getFullYear() - now.getFullYear()) * 12 +
        (g.deadline.getMonth() - now.getMonth()),
        1
      );

      // Compound inflation: FV = PV * (1 + r)^t
      inflationAdjustedTarget = Math.round(target * Math.pow(1 + inflationRate / 100, yearsLeft));
      inflationCost = inflationAdjustedTarget - target;

      requiredMonthlySaving = Math.ceil(remaining / monthsLeft);
      requiredMonthlySavingWithInflation = Math.ceil(Math.max(inflationAdjustedTarget - current, 0) / monthsLeft);

      advice = `Save ₹${requiredMonthlySavingWithInflation.toLocaleString('en-IN')}/month to achieve "${g.name}" on time, accounting for ${inflationRate}% annual inflation.`;
    }

    return {
      ...g,
      target,
      current,
      progress,
      remaining,
      monthsLeft,
      yearsLeft,
      inflationRate,
      inflationAdjustedTarget,
      inflationCost,
      requiredMonthlySaving,
      requiredMonthlySavingWithInflation,
      advice,
    };
  });
};

// ── Update goal metadata ──────────────────────────────────────────────────────
export const updateGoalService = async (
  userId: string,
  id: string,
  body: Partial<{ name: string; targetAmount: number; currentAmount: number; deadline: string; status: GoalStatus }>
) => {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();

  return prisma.goal.update({
    where: { id },
    data: { ...body, ...(body.deadline && { deadline: new Date(body.deadline) }) },
  });
};

// ── Add a contribution to a goal (increase currentAmount) ─────────────────────
export const contributeToGoalService = async (
  userId: string,
  id: string,
  amount: number
) => {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();

  const newAmount = Number(existing.currentAmount) + amount;
  const isComplete = newAmount >= Number(existing.targetAmount);

  return prisma.goal.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      status: isComplete ? "COMPLETED" : existing.status,
    },
  });
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteGoalService = async (userId: string, id: string) => {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();
  await prisma.goal.delete({ where: { id } });
};
