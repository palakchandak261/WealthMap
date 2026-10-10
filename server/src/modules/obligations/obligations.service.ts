import prisma from "../../lib/prisma";
import { ObligationType, Frequency } from "@prisma/client";

const notFound = () =>
  Object.assign(new Error("Obligation not found"), { statusCode: 404, code: "NOT_FOUND" });

// ── Create ────────────────────────────────────────────────────────────────────
export const createObligationService = async (
  userId: string,
  body: {
    name: string;
    type: ObligationType;
    amount: number;
    dueDate: string;
    frequency?: Frequency;
    isRecurring?: boolean;
  }
) => {
  return prisma.obligation.create({
    data: {
      userId,
      name:        body.name,
      type:        body.type,
      amount:      body.amount,
      dueDate:     new Date(body.dueDate),
      frequency:   body.frequency   ?? "MONTHLY",
      isRecurring: body.isRecurring ?? true,
    },
  });
};

// ── List all (optionally filter by paid status) ───────────────────────────────
export const getObligationsService = async (userId: string, isPaid?: boolean) => {
  return prisma.obligation.findMany({
    where: { userId, ...(isPaid !== undefined && { isPaid }) },
    orderBy: { dueDate: "asc" },
  });
};

// ── Upcoming: obligations due within the next `days` days (default 30) ───────
export const getUpcomingService = async (userId: string, days = 30) => {
  const now     = new Date();
  const future  = new Date();
  future.setDate(now.getDate() + days);

  return prisma.obligation.findMany({
    where: {
      userId,
      isPaid:  false,
      dueDate: { gte: now, lte: future },
    },
    orderBy: { dueDate: "asc" },
  });
};

// ── Update ────────────────────────────────────────────────────────────────────
export const updateObligationService = async (
  userId: string,
  id: string,
  body: Partial<{
    name: string;
    type: ObligationType;
    amount: number;
    dueDate: string;
    frequency: Frequency;
    isRecurring: boolean;
    isPaid: boolean;
  }>
) => {
  const existing = await prisma.obligation.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();

  return prisma.obligation.update({
    where: { id },
    data: { ...body, ...(body.dueDate && { dueDate: new Date(body.dueDate) }) },
  });
};

// ── Mark paid ─────────────────────────────────────────────────────────────────
export const markPaidService = async (userId: string, id: string) => {
  const existing = await prisma.obligation.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();

  return prisma.obligation.update({ where: { id }, data: { isPaid: true } });
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteObligationService = async (userId: string, id: string) => {
  const existing = await prisma.obligation.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();
  await prisma.obligation.delete({ where: { id } });
};
