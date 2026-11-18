/**
 * Demo-mode API (browser-only backend)
 * ────────────────────────────────────
 * Mirrors every REST route of the Express server against the localStorage demo
 * store, with the same response shapes ({ success, data, message }) and the
 * same error format, so every page behaves identically in demo and normal mode.
 * Engine numbers come from demoEngine.ts (ports of the server engines).
 */

import type { Budget, Expense, Goal, GoalContribution, Income, Obligation, ImportCounts } from '../types';
import { loadMockStore, saveMockStore, newId, type MockStore } from './mockData';
import {
  buildDemoFinancialState, runDemoForecast, runDemoRisk, runDemoHealth, runDemoSimulation,
  buildDemoGraph, buildDemoPlanning, buildDemoAdvice, enrichDemoBudget, findBudget,
  getDemoAnomalies, listDemoGoals, serializeDemoGoal,
} from './demoEngine';

export interface MockResponse {
  status: number;
  body: unknown;
}

export interface MockRequest {
  method?: string;
  url?: string;
  data?: unknown;
  params?: Record<string, unknown>;
}

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ok = (data: unknown, message?: string, status = 200): MockResponse =>
  ({ status, body: { success: true, data, ...(message && { message }) } });
const fail = (status: number, code: string, message: string): MockResponse =>
  ({ status, body: { success: false, error: { code, message } } });
const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} not found`);
const badRequest = (message: string) => new HttpError(400, 'VALIDATION_ERROR', message);

const now = () => new Date().toISOString();
const t = (d: string) => new Date(d).getTime();
const num = (v: unknown, field: string, { min = 0, allowZero = false } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || (!allowZero && n === 0)) throw badRequest(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} number`);
  return n;
};
const dateStr = (v: unknown, field: string) => {
  const d = new Date(String(v ?? ''));
  if (v === undefined || v === null || v === '' || Number.isNaN(d.getTime())) throw badRequest(`${field} must be a valid date`);
  return d.toISOString();
};
const pick = <T extends object>(body: Record<string, unknown>, keys: (keyof T)[]) =>
  Object.fromEntries(keys.filter((k) => body[k as string] !== undefined).map((k) => [k, body[k as string]])) as Partial<T>;

const parseBody = (data: unknown): Record<string, unknown> => {
  if (typeof data === 'string') {
    try { return data ? JSON.parse(data) : {}; } catch { return {}; }
  }
  return (data as Record<string, unknown>) ?? {};
};

const dayKey = (d: string) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const money = (n: unknown) => Number(n).toFixed(2);
const text = (s: unknown) => String(s ?? '').trim().toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
export const handleMockRequest = async (req: MockRequest): Promise<MockResponse> => {
  try {
    return route(req);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.code, err.message);
    console.error('[demo] unexpected error', err);
    return fail(500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Something went wrong in demo mode');
  }
};

const route = (req: MockRequest): MockResponse => {
  const method = (req.method ?? 'get').toUpperCase();
  const [rawPath, rawQuery = ''] = (req.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '').split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const query: Record<string, string> = { ...Object.fromEntries(new URLSearchParams(rawQuery)) };
  for (const [k, v] of Object.entries(req.params ?? {})) if (v !== undefined && v !== null) query[k] = String(v);
  const body = parseBody(req.data);
  const seg = path.split('/').filter(Boolean);       // e.g. ['goals', 'goal-1', 'contribute']
  const is = (m: string, pattern: string) => {
    if (m !== method) return false;
    const p = pattern.split('/').filter(Boolean);
    return p.length === seg.length && p.every((s, i) => s.startsWith(':') || s === seg[i]);
  };

  const store = loadMockStore();
  const commit = () => saveMockStore(store);

  // ── Auth / profile ──────────────────────────────────────────────────────────
  if (is('GET', '/auth/me') || is('GET', '/users/profile')) return ok(store.user);
  if (is('POST', '/auth/login')) return ok({ token: 'demo-token', user: store.user }, 'Logged in (demo)');
  if (seg[0] === 'auth') return fail(400, 'DEMO_MODE', 'This action is not available in demo mode. Log out of the demo to use a real account.');
  if (is('PATCH', '/users/profile')) {
    const numeric = ['cashBalance', 'savingsBalance', 'emergencyFundBalance', 'declaredMonthlyIncome'] as const;
    for (const k of numeric) if (body[k] !== undefined) num(body[k], k, { allowZero: true });
    store.user = {
      ...store.user,
      ...pick(body, ['name', 'currency', 'onboardingComplete']),
      ...Object.fromEntries(numeric.filter((k) => body[k] !== undefined).map((k) => [k, Number(body[k])])),
      updatedAt: now(),
    };
    commit();
    return ok(store.user, 'Profile updated');
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  if (is('GET', '/income')) return ok([...store.incomes].sort((a, b) => t(b.receivedAt) - t(a.receivedAt)));
  if (is('POST', '/income')) {
    if (!String(body.source ?? '').trim()) throw badRequest('Source is required');
    const inc: Income = {
      id: newId('inc'), userId: store.user.id, source: String(body.source).trim(), amount: num(body.amount, 'amount'),
      frequency: (body.frequency as Income['frequency']) ?? 'MONTHLY', isRecurring: body.isRecurring !== undefined ? Boolean(body.isRecurring) : true,
      receivedAt: body.receivedAt ? dateStr(body.receivedAt, 'receivedAt') : now(), createdAt: now(), updatedAt: now(),
    };
    store.incomes.unshift(inc);
    commit();
    return ok(inc, 'Income added', 201);
  }
  if (is('PATCH', '/income/:id')) {
    const inc = store.incomes.find((i) => i.id === seg[1]);
    if (!inc) throw notFound('Income');
    Object.assign(inc, pick<Income>(body, ['source', 'frequency', 'isRecurring']),
      body.amount !== undefined && { amount: num(body.amount, 'amount') },
      body.receivedAt !== undefined && { receivedAt: dateStr(body.receivedAt, 'receivedAt') },
      { updatedAt: now() });
    commit();
    return ok(inc, 'Income updated');
  }
  if (is('DELETE', '/income/:id')) {
    if (!store.incomes.some((i) => i.id === seg[1])) throw notFound('Income');
    store.incomes = store.incomes.filter((i) => i.id !== seg[1]);
    commit();
    return ok(null, 'Income deleted');
  }

  // ── Expenses ────────────────────────────────────────────────────────────────
  if (is('GET', '/expenses')) {
    let list = [...store.expenses];
    if (query.month && query.year) {
      const s = new Date(Number(query.year), Number(query.month) - 1, 1).getTime();
      const e = new Date(Number(query.year), Number(query.month), 0, 23, 59, 59, 999).getTime();
      list = list.filter((x) => t(x.spentAt) >= s && t(x.spentAt) <= e);
    }
    if (query.category) list = list.filter((x) => x.category === query.category);
    return ok(list.sort((a, b) => t(b.spentAt) - t(a.spentAt)));
  }
  if (is('POST', '/expenses')) {
    const exp = makeExpense(store, body);
    store.expenses.unshift(exp);
    commit();
    return ok(exp, 'Expense added', 201);
  }
  if (is('POST', '/expenses/bulk')) {
    const items = Array.isArray(req.data) ? req.data : Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) throw badRequest('No expenses to import');
    const created = items.map((it: Record<string, unknown>, i: number) => {
      try { return makeExpense(store, it); } catch (e) { throw badRequest(`Row ${i + 1}: ${(e as Error).message}`); }
    });
    store.expenses.unshift(...created);
    commit();
    return ok({ count: created.length }, `${created.length} expenses imported`, 201);
  }
  if (is('PATCH', '/expenses/:id')) {
    const exp = store.expenses.find((e) => e.id === seg[1]);
    if (!exp) throw notFound('Expense');
    Object.assign(exp, pick<Expense>(body, ['category', 'description', 'paymentMethod', 'isRecurring']),
      body.amount !== undefined && { amount: num(body.amount, 'amount') },
      body.spentAt !== undefined && { spentAt: dateStr(body.spentAt, 'spentAt') },
      { updatedAt: now() });
    commit();
    return ok(exp, 'Expense updated');
  }
  if (is('DELETE', '/expenses/:id')) {
    if (!store.expenses.some((e) => e.id === seg[1])) throw notFound('Expense');
    store.expenses = store.expenses.filter((e) => e.id !== seg[1]);
    commit();
    return ok(null, 'Expense deleted');
  }

  // ── Budgets ─────────────────────────────────────────────────────────────────
  if (is('GET', '/budgets')) {
    return ok([...store.budgets].sort((a, b) => b.year - a.year || b.month - a.month));
  }
  if (is('GET', '/budgets/current')) {
    const d = new Date();
    const b = findBudget(store, d.getMonth() + 1, d.getFullYear());
    return ok(b ? enrichDemoBudget(store, b) : null);
  }
  if (is('GET', '/budgets/:id')) {
    const b = store.budgets.find((x) => x.id === seg[1]);
    if (!b) throw notFound('Budget');
    return ok(b);
  }
  if (is('POST', '/budgets')) {
    const month = Number(body.month), year = Number(body.year);
    if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) throw badRequest('A valid month and year are required');
    const total = num(body.totalBudget, 'totalBudget');
    let b = findBudget(store, month, year);
    if (!b) {
      b = { id: `budget-${year}-${month}-${Date.now().toString(36)}`, userId: store.user.id, month, year, totalBudget: total, categoryBudgets: [], createdAt: now(), updatedAt: now() };
      store.budgets.push(b);
    }
    b.totalBudget = total;
    b.categoryBudgets = toCategoryBudgets(b.id, body.categoryBudgets);
    b.updatedAt = now();
    commit();
    return ok(b, 'Budget saved', 201);
  }
  if (is('PATCH', '/budgets/:id')) {
    const b = store.budgets.find((x) => x.id === seg[1]);
    if (!b) throw notFound('Budget');
    if (body.totalBudget !== undefined) b.totalBudget = num(body.totalBudget, 'totalBudget');
    if (body.categoryBudgets !== undefined) b.categoryBudgets = toCategoryBudgets(b.id, body.categoryBudgets);
    b.updatedAt = now();
    commit();
    return ok(b, 'Budget updated');
  }
  if (is('DELETE', '/budgets/:id')) {
    if (!store.budgets.some((x) => x.id === seg[1])) throw notFound('Budget');
    store.budgets = store.budgets.filter((x) => x.id !== seg[1]);
    commit();
    return ok(null, 'Budget deleted');
  }

  // ── Obligations ─────────────────────────────────────────────────────────────
  if (is('GET', '/obligations')) {
    let list = [...store.obligations];
    if (query.isPaid === 'true' || query.isPaid === 'false') list = list.filter((o) => o.isPaid === (query.isPaid === 'true'));
    return ok(list.sort((a, b) => t(a.dueDate) - t(b.dueDate)));
  }
  if (is('GET', '/obligations/upcoming')) {
    const days = Number(query.days) || 30;
    const from = Date.now(), to = from + days * 86_400_000;
    return ok(store.obligations.filter((o) => !o.isPaid && t(o.dueDate) >= from && t(o.dueDate) <= to).sort((a, b) => t(a.dueDate) - t(b.dueDate)));
  }
  if (is('POST', '/obligations')) {
    if (!String(body.name ?? '').trim()) throw badRequest('Name is required');
    const o: Obligation = {
      id: newId('obl'), userId: store.user.id, name: String(body.name).trim(), type: (body.type as Obligation['type']) ?? 'OTHER',
      amount: num(body.amount, 'amount'), dueDate: dateStr(body.dueDate, 'dueDate'),
      frequency: (body.frequency as Obligation['frequency']) ?? 'MONTHLY',
      isRecurring: body.isRecurring !== undefined ? Boolean(body.isRecurring) : true,
      isPaid: Boolean(body.isPaid), createdAt: now(), updatedAt: now(),
    };
    store.obligations.push(o);
    commit();
    return ok(o, 'Obligation created', 201);
  }
  if (is('PATCH', '/obligations/:id/pay') || is('PATCH', '/obligations/:id')) {
    const o = store.obligations.find((x) => x.id === seg[1]);
    if (!o) throw notFound('Obligation');
    if (seg[2] === 'pay') o.isPaid = true;
    else Object.assign(o, pick<Obligation>(body, ['name', 'type', 'frequency', 'isRecurring', 'isPaid']),
      body.amount !== undefined && { amount: num(body.amount, 'amount') },
      body.dueDate !== undefined && { dueDate: dateStr(body.dueDate, 'dueDate') });
    o.updatedAt = now();
    commit();
    return ok(o, seg[2] === 'pay' ? 'Marked as paid' : 'Obligation updated');
  }
  if (is('DELETE', '/obligations/:id')) {
    if (!store.obligations.some((x) => x.id === seg[1])) throw notFound('Obligation');
    store.obligations = store.obligations.filter((x) => x.id !== seg[1]);
    commit();
    return ok(null, 'Obligation deleted');
  }

  // ── Goals ───────────────────────────────────────────────────────────────────
  if (is('GET', '/goals')) {
    const rate = query.inflationRate !== undefined && query.inflationRate !== '' && Number.isFinite(Number(query.inflationRate)) ? Number(query.inflationRate) : null;
    return ok(listDemoGoals(store, rate));
  }
  if (is('POST', '/goals')) {
    if (!String(body.name ?? '').trim()) throw badRequest('Goal name is required');
    const target = num(body.targetAmount, 'targetAmount');
    const current = body.currentAmount !== undefined ? num(body.currentAmount, 'currentAmount', { allowZero: true }) : 0;
    const g: Goal = {
      id: newId('goal'), userId: store.user.id, name: String(body.name).trim(), targetAmount: target, currentAmount: current,
      deadline: body.deadline ? dateStr(body.deadline, 'deadline') : null,
      status: (body.status as Goal['status']) ?? (current >= target ? 'COMPLETED' : 'ACTIVE'),
      category: (body.category as string) ?? 'OTHER', priority: (body.priority as Goal['priority']) ?? 'MEDIUM',
      inflationRate: inflationOrNull(body.inflationRate), createdAt: now(), updatedAt: now(),
    };
    store.goals.push(g);
    commit();
    return ok(serializeDemoGoal(store, g), 'Goal created', 201);
  }
  if (is('PATCH', '/goals/:id/contribute')) {
    const g = store.goals.find((x) => x.id === seg[1]);
    if (!g) throw notFound('Goal');
    const amount = num(body.amount, 'amount');
    const c: GoalContribution = {
      id: newId('gc'), goalId: g.id, userId: store.user.id, amount,
      note: body.note ? String(body.note).slice(0, 120) : null,
      contributedAt: body.contributedAt ? dateStr(body.contributedAt, 'contributedAt') : now(),
    };
    store.goalContributions.push(c);
    g.currentAmount = Number(g.currentAmount) + amount;
    if (g.currentAmount >= Number(g.targetAmount)) g.status = 'COMPLETED';
    g.updatedAt = now();
    commit();
    return ok(serializeDemoGoal(store, g), 'Contribution added');
  }
  if (is('PATCH', '/goals/:id')) {
    const g = store.goals.find((x) => x.id === seg[1]);
    if (!g) throw notFound('Goal');
    if (body.name !== undefined && !String(body.name).trim()) throw badRequest('Goal name is required');
    Object.assign(g, pick<Goal>(body, ['name', 'category', 'priority']),
      body.targetAmount !== undefined && { targetAmount: num(body.targetAmount, 'targetAmount') },
      body.currentAmount !== undefined && { currentAmount: num(body.currentAmount, 'currentAmount', { allowZero: true }) },
      body.deadline !== undefined && { deadline: body.deadline ? dateStr(body.deadline, 'deadline') : null },
      body.inflationRate !== undefined && { inflationRate: inflationOrNull(body.inflationRate) });
    if (body.status) g.status = body.status as Goal['status'];
    else if (g.status === 'COMPLETED' && g.currentAmount < g.targetAmount) g.status = 'ACTIVE';
    else if (g.status === 'ACTIVE' && g.currentAmount >= g.targetAmount) g.status = 'COMPLETED';
    g.updatedAt = now();
    commit();
    return ok(serializeDemoGoal(store, g), 'Goal updated');
  }
  if (is('DELETE', '/goals/:id')) {
    if (!store.goals.some((x) => x.id === seg[1])) throw notFound('Goal');
    store.goals = store.goals.filter((x) => x.id !== seg[1]);
    store.goalContributions = store.goalContributions.filter((c) => c.goalId !== seg[1]);
    commit();
    return ok(null, 'Goal deleted');
  }

  // ── Import (CSV / Excel / JSON) ─────────────────────────────────────────────
  if (is('POST', '/import')) {
    const result = importIntoStore(store, body);
    commit();
    return ok(result, `Imported ${result.total} record${result.total === 1 ? '' : 's'}`, 201);
  }

  // ── Engines ─────────────────────────────────────────────────────────────────
  if (seg[0] === 'engine' || seg[0] === 'ai') {
    const state = buildDemoFinancialState(store);
    const forecast = runDemoForecast(store, state);
    const risk = runDemoRisk(state, forecast);
    const health = runDemoHealth(state, forecast);

    if (is('GET', '/engine/financial-state')) return ok(state);
    if (is('GET', '/engine/forecast')) return ok(forecast);
    if (is('GET', '/engine/risk')) return ok(risk);
    if (is('GET', '/engine/health-score')) return ok(health);
    if (is('GET', '/engine/risk-history')) return ok([]);
    if (is('GET', '/engine/anomalies')) return ok(getDemoAnomalies(store));
    if (is('GET', '/engine/dependency-graph')) return ok(buildDemoGraph(state, risk.riskScore));
    if (is('GET', '/engine/safe-to-spend')) {
      return ok({
        safeSpendableAmount: state.safeSpendableAmount, safeDailySpending: state.safeDailySpending,
        daysRemaining: state.daysRemainingInMonth, budgetRemaining: state.totalRemaining,
        upcomingObligations: state.totalUpcomingAmount, dueThisMonth: state.dueThisMonthAmount ?? 0,
        appreciation: state.appreciation ?? null,
      });
    }
    if (is('GET', '/engine/planning')) {
      const rate = query.inflationRate !== undefined && query.inflationRate !== '' ? Number(query.inflationRate) : null;
      if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 50)) throw badRequest('inflationRate must be between 0 and 50');
      return ok(buildDemoPlanning(store, state, forecast, { inflationRate: rate, inflationEnabled: query.inflation !== 'off' }));
    }
    if (is('POST', '/engine/simulate')) {
      const amount = Number(body.amount);
      if (!amount || Number.isNaN(amount)) throw badRequest('amount is required and must be a number');
      return ok(runDemoSimulation(state, forecast, risk, health, {
        amount, category: body.category as string | undefined, description: body.description as string | undefined,
      }));
    }
    if (is('POST', '/ai/recommendations')) {
      const rate = Number(body.inflationRate);
      const planning = buildDemoPlanning(store, state, forecast, { inflationRate: Number.isFinite(rate) && rate >= 0 && rate <= 50 ? rate : null });
      const prompt = typeof body.context === 'string' ? body.context.slice(0, 500) : undefined;
      return ok(buildDemoAdvice(state, forecast, risk, health, planning, prompt));
    }
  }

  return fail(404, 'NOT_FOUND', `Route ${method} ${path} is not available in demo mode`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER'];

const makeExpense = (store: MockStore, b: Record<string, unknown>): Expense => {
  const category = String(b.category ?? '').trim().toUpperCase();
  if (!category) throw badRequest('Category is required');
  return {
    id: newId('exp'), userId: store.user.id, category, amount: num(b.amount, 'amount'),
    description: b.description ? String(b.description) : undefined,
    paymentMethod: (PAYMENT_METHODS.includes(String(b.paymentMethod)) ? b.paymentMethod : 'OTHER') as Expense['paymentMethod'],
    isRecurring: Boolean(b.isRecurring), spentAt: dateStr(b.spentAt ?? now(), 'spentAt'), createdAt: now(), updatedAt: now(),
  };
};

const toCategoryBudgets = (budgetId: string, raw: unknown): Budget['categoryBudgets'] =>
  (Array.isArray(raw) ? raw : []).map((cb: Record<string, unknown>, i) => ({
    id: `${budgetId}-cb-${i}-${Date.now().toString(36)}`, budgetId,
    category: String(cb.category ?? 'OTHER').toUpperCase(), limit: num(cb.limit, `${cb.category ?? 'category'} limit`),
    createdAt: now(), updatedAt: now(),
  }));

const inflationOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 50) throw badRequest('inflationRate must be between 0 and 50');
  return n;
};

/** Multiset counter so each existing record absorbs at most one duplicate (same as server). */
const counter = (keys: string[]) => {
  const map = new Map<string, number>();
  for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1);
  return (k: string) => { const n = map.get(k) ?? 0; if (n > 0) { map.set(k, n - 1); return true; } return false; };
};

/** Same semantics as server/src/modules/import/import.service.ts */
const importIntoStore = (store: MockStore, body: Record<string, unknown>) => {
  const arr = (k: string) => (Array.isArray(body[k]) ? body[k] as Record<string, unknown>[] : []);
  const skipDup = (body.options as { skipDuplicates?: boolean } | undefined)?.skipDuplicates !== false;
  const created: ImportCounts = { expenses: 0, incomes: 0, obligations: 0, goals: 0, budgets: 0 };
  const skipped: ImportCounts = { expenses: 0, incomes: 0, obligations: 0, goals: 0, budgets: 0 };
  const sections = ['expenses', 'incomes', 'obligations', 'goals', 'budgets'];
  if (sections.every((s) => arr(s).length === 0)) throw badRequest('Nothing to import — the file has no valid rows');

  // Validate everything first so a bad row aborts the whole import (like the DB transaction)
  const rowError = (section: string, i: number, e: unknown) => badRequest(`${section} row ${i + 1}: ${(e as Error).message}`);
  const expenses = arr('expenses').map((r, i) => { try { return makeExpense(store, r); } catch (e) { throw rowError('expenses', i, e); } });
  const incomes = arr('incomes').map((r, i): Income => {
    try {
      if (!String(r.source ?? '').trim()) throw badRequest('source is required');
      return { id: newId('inc'), userId: store.user.id, source: String(r.source).trim(), amount: num(r.amount, 'amount'), frequency: (r.frequency as Income['frequency']) ?? 'MONTHLY', isRecurring: r.isRecurring !== undefined ? Boolean(r.isRecurring) : true, receivedAt: dateStr(r.receivedAt, 'receivedAt'), createdAt: now(), updatedAt: now() };
    } catch (e) { throw rowError('incomes', i, e); }
  });
  const obligations = arr('obligations').map((r, i): Obligation => {
    try {
      if (!String(r.name ?? '').trim()) throw badRequest('name is required');
      return { id: newId('obl'), userId: store.user.id, name: String(r.name).trim(), type: (r.type as Obligation['type']) ?? 'OTHER', amount: num(r.amount, 'amount'), dueDate: dateStr(r.dueDate, 'dueDate'), frequency: (r.frequency as Obligation['frequency']) ?? 'MONTHLY', isRecurring: r.isRecurring !== undefined ? Boolean(r.isRecurring) : true, isPaid: Boolean(r.isPaid), createdAt: now(), updatedAt: now() };
    } catch (e) { throw rowError('obligations', i, e); }
  });
  const goals = arr('goals').map((r, i): Goal => {
    try {
      if (!String(r.name ?? '').trim()) throw badRequest('name is required');
      const target = num(r.targetAmount, 'targetAmount');
      const current = r.currentAmount !== undefined ? num(r.currentAmount, 'currentAmount', { allowZero: true }) : 0;
      return { id: newId('goal'), userId: store.user.id, name: String(r.name).trim(), targetAmount: target, currentAmount: current, deadline: r.deadline ? dateStr(r.deadline, 'deadline') : null, status: (r.status as Goal['status']) ?? (current >= target ? 'COMPLETED' : 'ACTIVE'), category: (r.category as string) ?? 'OTHER', priority: (r.priority as Goal['priority']) ?? 'MEDIUM', inflationRate: inflationOrNull(r.inflationRate), createdAt: now(), updatedAt: now() };
    } catch (e) { throw rowError('goals', i, e); }
  });

  // Expenses
  const expTake = counter(store.expenses.map((e) => `${dayKey(e.spentAt)}|${money(e.amount)}|${e.category}|${text(e.description)}`));
  for (const e of expenses) {
    if (skipDup && expTake(`${dayKey(e.spentAt)}|${money(e.amount)}|${e.category}|${text(e.description)}`)) { skipped.expenses++; continue; }
    store.expenses.push(e); created.expenses++;
  }
  // Incomes
  const incTake = counter(store.incomes.map((x) => `${dayKey(x.receivedAt)}|${money(x.amount)}|${text(x.source)}`));
  for (const x of incomes) {
    if (skipDup && incTake(`${dayKey(x.receivedAt)}|${money(x.amount)}|${text(x.source)}`)) { skipped.incomes++; continue; }
    store.incomes.push(x); created.incomes++;
  }
  // Obligations
  const oblTake = counter(store.obligations.map((o) => `${text(o.name)}|${money(o.amount)}|${dayKey(o.dueDate)}`));
  for (const o of obligations) {
    if (skipDup && oblTake(`${text(o.name)}|${money(o.amount)}|${dayKey(o.dueDate)}`)) { skipped.obligations++; continue; }
    store.obligations.push(o); created.obligations++;
  }
  // Goals (duplicate = same name)
  const names = new Set(store.goals.map((g) => text(g.name)));
  for (const g of goals) {
    if (skipDup && names.has(text(g.name))) { skipped.goals++; continue; }
    names.add(text(g.name));
    store.goals.push(g); created.goals++;
  }
  // Budgets: upsert month, merge category limits
  for (const [i, b] of arr('budgets').entries()) {
    const month = Number(b.month), year = Number(b.year);
    if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) throw badRequest(`budgets row ${i + 1}: invalid month/year`);
    const cats = (Array.isArray(b.categories) ? b.categories : []) as { category: string; limit: number }[];
    const sumLimits = cats.reduce((s, c) => s + Number(c.limit || 0), 0);
    let budget = findBudget(store, month, year);
    const total = b.totalBudget != null ? Number(b.totalBudget) : budget ? budget.totalBudget : sumLimits;
    if (!total || total <= 0) { skipped.budgets++; continue; }
    if (!budget) {
      budget = { id: `budget-${year}-${month}-${Date.now().toString(36)}`, userId: store.user.id, month, year, totalBudget: total, categoryBudgets: [], createdAt: now(), updatedAt: now() };
      store.budgets.push(budget);
    }
    budget.totalBudget = total;
    for (const c of cats) {
      const category = String(c.category).toUpperCase();
      const limit = num(c.limit, `${category} limit`);
      const existing = budget.categoryBudgets.find((x) => x.category === category);
      if (existing) { existing.limit = limit; existing.updatedAt = now(); }
      else budget.categoryBudgets.push({ id: `${budget.id}-${category}`, budgetId: budget.id, category, limit, createdAt: now(), updatedAt: now() });
    }
    budget.updatedAt = now();
    created.budgets++;
  }

  const total = Object.values(created).reduce((s, n) => s + n, 0);
  return { created, skipped, total };
};
