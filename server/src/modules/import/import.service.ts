/**
 * Full-project import (CSV / Excel / JSON parsed on the client)
 * ─────────────────────────────────────────────────────────────
 * Writes expenses, incomes, obligations, goals and budgets in ONE transaction.
 * Duplicate detection makes re-importing the same sheet safe: a row is skipped
 * when an identical record already exists (same day, amount and label).
 */

import prisma from "../../lib/prisma";
import type { ImportPayload } from "./import.schemas";

type Section = "expenses" | "incomes" | "obligations" | "goals" | "budgets";
export type ImportCounts = Record<Section, number>;

const dayKey = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
};
const money = (n: unknown) => Number(n).toFixed(2);
const text  = (s: unknown) => String(s ?? "").trim().toLowerCase();

/** Multiset of existing keys — each existing record can "absorb" one incoming duplicate. */
const counter = (keys: string[]) => {
  const map = new Map<string, number>();
  for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1);
  return {
    take(k: string) {
      const n = map.get(k) ?? 0;
      if (n > 0) { map.set(k, n - 1); return true; }
      return false;
    },
  };
};

const dateRange = (dates: string[]) => {
  const times = dates.map((d) => new Date(d).getTime());
  const min = new Date(Math.min(...times)); min.setHours(0, 0, 0, 0);
  const max = new Date(Math.max(...times)); max.setHours(23, 59, 59, 999);
  return { gte: min, lte: max };
};

export const importDataService = async (userId: string, payload: ImportPayload) => {
  const skip = payload.options.skipDuplicates;
  const created: ImportCounts = { expenses: 0, incomes: 0, obligations: 0, goals: 0, budgets: 0 };
  const skipped: ImportCounts = { expenses: 0, incomes: 0, obligations: 0, goals: 0, budgets: 0 };

  await prisma.$transaction(async (tx) => {
    // ── Expenses ──────────────────────────────────────────────────────────────
    if (payload.expenses.length) {
      let rows = payload.expenses;
      if (skip) {
        const existing = await tx.expense.findMany({
          where:  { userId, spentAt: dateRange(rows.map((r) => r.spentAt)) },
          select: { spentAt: true, amount: true, category: true, description: true },
        });
        const seen = counter(existing.map((e) => `${dayKey(e.spentAt)}|${money(e.amount)}|${e.category}|${text(e.description)}`));
        rows = rows.filter((r) => !seen.take(`${dayKey(r.spentAt)}|${money(r.amount)}|${r.category}|${text(r.description)}`));
      }
      skipped.expenses = payload.expenses.length - rows.length;
      if (rows.length) {
        const res = await tx.expense.createMany({
          data: rows.map((r) => ({
            userId, category: r.category, amount: r.amount, description: r.description || null,
            paymentMethod: r.paymentMethod, isRecurring: r.isRecurring, spentAt: new Date(r.spentAt),
          })),
        });
        created.expenses = res.count;
      }
    }

    // ── Incomes ───────────────────────────────────────────────────────────────
    if (payload.incomes.length) {
      let rows = payload.incomes;
      if (skip) {
        const existing = await tx.income.findMany({
          where:  { userId, receivedAt: dateRange(rows.map((r) => r.receivedAt)) },
          select: { receivedAt: true, amount: true, source: true },
        });
        const seen = counter(existing.map((e) => `${dayKey(e.receivedAt)}|${money(e.amount)}|${text(e.source)}`));
        rows = rows.filter((r) => !seen.take(`${dayKey(r.receivedAt)}|${money(r.amount)}|${text(r.source)}`));
      }
      skipped.incomes = payload.incomes.length - rows.length;
      if (rows.length) {
        const res = await tx.income.createMany({
          data: rows.map((r) => ({
            userId, source: r.source, amount: r.amount, frequency: r.frequency,
            isRecurring: r.isRecurring, receivedAt: new Date(r.receivedAt),
          })),
        });
        created.incomes = res.count;
      }
    }

    // ── Obligations ───────────────────────────────────────────────────────────
    if (payload.obligations.length) {
      let rows = payload.obligations;
      if (skip) {
        const existing = await tx.obligation.findMany({ where: { userId }, select: { name: true, amount: true, dueDate: true } });
        const seen = counter(existing.map((o) => `${text(o.name)}|${money(o.amount)}|${dayKey(o.dueDate)}`));
        rows = rows.filter((r) => !seen.take(`${text(r.name)}|${money(r.amount)}|${dayKey(r.dueDate)}`));
      }
      skipped.obligations = payload.obligations.length - rows.length;
      if (rows.length) {
        const res = await tx.obligation.createMany({
          data: rows.map((r) => ({
            userId, name: r.name, type: r.type, amount: r.amount, dueDate: new Date(r.dueDate),
            frequency: r.frequency, isRecurring: r.isRecurring, isPaid: r.isPaid,
          })),
        });
        created.obligations = res.count;
      }
    }

    // ── Goals (duplicate = same name) ─────────────────────────────────────────
    if (payload.goals.length) {
      let rows = payload.goals;
      if (skip) {
        const existing = await tx.goal.findMany({ where: { userId }, select: { name: true } });
        const names = new Set(existing.map((g) => text(g.name)));
        rows = rows.filter((r) => {
          const k = text(r.name);
          if (names.has(k)) return false;
          names.add(k);
          return true;
        });
      }
      skipped.goals = payload.goals.length - rows.length;
      if (rows.length) {
        const res = await tx.goal.createMany({
          data: rows.map((r) => ({
            userId, name: r.name, targetAmount: r.targetAmount, currentAmount: r.currentAmount,
            deadline: r.deadline ? new Date(r.deadline) : null,
            status: r.status ?? (r.currentAmount >= r.targetAmount ? "COMPLETED" : "ACTIVE"),
            category: r.category, priority: r.priority, inflationRate: r.inflationRate ?? null,
          })),
        });
        created.goals = res.count;
      }
    }

    // ── Budgets: upsert month, merge category limits ──────────────────────────
    for (const b of payload.budgets) {
      const sumLimits = b.categories.reduce((s, c) => s + c.limit, 0);
      const existing = await tx.budget.findUnique({
        where: { userId_month_year: { userId, month: b.month, year: b.year } },
      });
      const total = b.totalBudget ?? (existing ? Number(existing.totalBudget) : sumLimits);
      if (!total || total <= 0) { skipped.budgets++; continue; }

      const budget = existing
        ? await tx.budget.update({ where: { id: existing.id }, data: { totalBudget: total } })
        : await tx.budget.create({ data: { userId, month: b.month, year: b.year, totalBudget: total } });

      for (const c of b.categories) {
        await tx.categoryBudget.upsert({
          where:  { budgetId_category: { budgetId: budget.id, category: c.category } },
          create: { budgetId: budget.id, category: c.category, limit: c.limit },
          update: { limit: c.limit },
        });
      }
      created.budgets++;
    }
  }, { timeout: 30_000 });

  const total = Object.values(created).reduce((s, n) => s + n, 0);
  return { created, skipped, total };
};
