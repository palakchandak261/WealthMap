import prisma from "../../lib/prisma";
import { Frequency } from "@prisma/client";

const notFound = () => Object.assign(new Error("Income record not found"), { statusCode: 404, code: "NOT_FOUND" });

export const addIncomeService = async (
  userId: string,
  body: { source: string; amount: number; frequency?: Frequency; isRecurring?: boolean; receivedAt: string }
) => {
  return prisma.income.create({
    data: {
      userId,
      source:      body.source,
      amount:      body.amount,
      frequency:   body.frequency  ?? "MONTHLY",
      isRecurring: body.isRecurring ?? true,
      receivedAt:  new Date(body.receivedAt),
    },
  });
};

export const getIncomesService = async (userId: string, year?: number) => {
  return prisma.income.findMany({
    where: {
      userId,
      ...(year && {
        receivedAt: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      }),
    },
    orderBy: { receivedAt: "desc" },
  });
};

export const updateIncomeService = async (userId: string, id: string, body: Partial<{
  source: string; amount: number; frequency: Frequency; isRecurring: boolean; receivedAt: string;
}>) => {
  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();

  return prisma.income.update({
    where: { id },
    data: { ...body, ...(body.receivedAt && { receivedAt: new Date(body.receivedAt) }) },
  });
};

export const deleteIncomeService = async (userId: string, id: string) => {
  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) throw notFound();
  await prisma.income.delete({ where: { id } });
};
