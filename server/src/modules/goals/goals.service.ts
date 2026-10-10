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

// ── List all active goals with progress ──────────────────────────────────────
export const getGoalsService = async (userId: string) => {
  const goals = await prisma.goal.findMany({
    where:   { userId },
    orderBy: { createdAt: "asc" },
  });

  return goals.map((g) => {
    const target   = Number(g.targetAmount);
    const current  = Number(g.currentAmount);
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;
    const remaining = Math.max(target - current, 0);

    // Required monthly saving to hit deadline from today
    let requiredMonthlySaving: number | null = null;
    if (g.deadline && remaining > 0) {
      const monthsLeft = Math.max(
        (g.deadline.getFullYear() - new Date().getFullYear()) * 12 +
        (g.deadline.getMonth() - new Date().getMonth()),
        1
      );
      requiredMonthlySaving = Math.ceil(remaining / monthsLeft);
    }

    return { ...g, target, current, progress, remaining, requiredMonthlySaving };
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
