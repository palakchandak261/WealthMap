import prisma from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { buildGoalPlan } from "../../lib/finance";
import type { CreateGoalInput, UpdateGoalInput } from "./goals.schemas";

const notFound = () =>
  Object.assign(new Error("Goal not found"), { statusCode: 404, code: "NOT_FOUND" });

const goalWithHistory = Prisma.validator<Prisma.GoalDefaultArgs>()({
  include: { contributions: { orderBy: { contributedAt: "desc" }, take: 24 } },
});
type GoalWithHistory = Prisma.GoalGetPayload<typeof goalWithHistory>;

/** Decimal → number and attach the computed plan ("save ₹X/month"). */
const serialize = (g: GoalWithHistory, opts: { inflationRate?: number | null } = {}) => {
  const goal = {
    ...g,
    targetAmount:  Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    inflationRate: g.inflationRate != null ? Number(g.inflationRate) : null,
    contributions: g.contributions.map((c) => ({ ...c, amount: Number(c.amount) })),
  };
  return {
    ...goal,
    plan: buildGoalPlan(
      { ...goal, contributions: goal.contributions },
      { flatRate: opts.inflationRate ?? null }
    ),
  };
};

const ensureOwned = async (userId: string, id: string) => {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();
  return existing;
};

// ── Create ────────────────────────────────────────────────────────────────────
export const createGoalService = async (userId: string, body: CreateGoalInput) => {
  const goal = await prisma.goal.create({
    data: {
      userId,
      name:          body.name,
      targetAmount:  body.targetAmount,
      currentAmount: body.currentAmount ?? 0,
      deadline:      body.deadline ? new Date(body.deadline) : null,
      status:        body.status ?? ((body.currentAmount ?? 0) >= body.targetAmount ? "COMPLETED" : "ACTIVE"),
      category:      body.category,
      priority:      body.priority,
      inflationRate: body.inflationRate ?? null,
    },
    ...goalWithHistory,
  });
  return serialize(goal);
};

// ── List with contribution history + inflation-aware plan ─────────────────────
export const getGoalsService = async (userId: string, options?: { inflationRate?: number | null }) => {
  const goals = await prisma.goal.findMany({
    where:   { userId },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    ...goalWithHistory,
  });
  return goals.map((g) => serialize(g, options));
};

// ── Update goal metadata ──────────────────────────────────────────────────────
export const updateGoalService = async (userId: string, id: string, body: UpdateGoalInput) => {
  const existing = await ensureOwned(userId, id);
  const { deadline, ...rest } = body;

  const target  = rest.targetAmount  ?? Number(existing.targetAmount);
  const current = rest.currentAmount ?? Number(existing.currentAmount);
  // Re-open a completed goal when its target is raised above what is saved
  const status = rest.status
    ?? (existing.status === "COMPLETED" && current < target ? "ACTIVE"
      : existing.status === "ACTIVE" && current >= target ? "COMPLETED"
      : undefined);

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...rest,
      ...(status && { status }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
    },
    ...goalWithHistory,
  });
  return serialize(goal);
};

// ── Add a contribution (records history + increases currentAmount) ────────────
export const contributeToGoalService = async (
  userId: string,
  id: string,
  input: { amount: number; note?: string; contributedAt?: string }
) => {
  const existing = await ensureOwned(userId, id);
  const newAmount  = Number(existing.currentAmount) + input.amount;
  const isComplete = newAmount >= Number(existing.targetAmount);

  const [, goal] = await prisma.$transaction([
    prisma.goalContribution.create({
      data: {
        goalId: id,
        userId,
        amount: input.amount,
        note:   input.note || null,
        contributedAt: input.contributedAt ? new Date(input.contributedAt) : new Date(),
      },
    }),
    prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        status: isComplete ? "COMPLETED" : existing.status,
      },
      ...goalWithHistory,
    }),
  ]);
  return serialize(goal);
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteGoalService = async (userId: string, id: string) => {
  await ensureOwned(userId, id);
  await prisma.goal.delete({ where: { id } });
};
