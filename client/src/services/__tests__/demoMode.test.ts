/**
 * Demo mode end-to-end: goes through the real axios instance, which routes
 * every request to the in-browser backend when demo mode is on.
 */
import api from '../api';
import { resetMockStore, loadMockStore } from '../mockData';
import type { AxiosError } from 'axios';

const iso = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString();

beforeEach(() => {
  localStorage.clear();
  resetMockStore();
  localStorage.setItem('wm_demo_mode', 'true');
  localStorage.setItem('wm_token', 'demo-token');
});

const status = async (p: Promise<unknown>) => {
  try { await p; return 200; } catch (e) { return (e as AxiosError).response?.status ?? -1; }
};

describe('demo mode backend', () => {
  it('serves the dashboard engines with appreciation and bills due this month', async () => {
    const { data } = await api.get('/engine/financial-state');
    const s = data.data;
    expect(s.totalBudget).toBeGreaterThan(0);
    expect(typeof s.dueThisMonthAmount).toBe('number');
    expect(s.appreciation?.level).toBeDefined();
    const safe = (await api.get('/engine/safe-to-spend')).data.data;
    expect(safe).toHaveProperty('dueThisMonth');
    expect(safe).toHaveProperty('appreciation');
    for (const path of ['/engine/forecast', '/engine/risk', '/engine/health-score', '/engine/dependency-graph', '/engine/anomalies']) {
      expect((await api.get(path)).status).toBe(200);
    }
  });

  it('computes goal plans, inflation modes and the savings allocation', async () => {
    const plan = (await api.get('/engine/planning')).data.data;
    expect(plan.goalPlans.length).toBeGreaterThan(0);
    expect(plan.yearlyProjection.annualBaseline).toBeGreaterThan(0);
    expect(plan.savingsPlan.allocations.length).toBeGreaterThan(0);
    const flat = (await api.get('/engine/planning?inflationRate=8')).data.data;
    expect(flat.goalPlans.every((g: { inflationRate: number }) => g.inflationRate === 8)).toBe(true);
    const off = (await api.get('/engine/planning?inflation=off')).data.data;
    expect(off.goalPlans.every((g: { inflationCost: number }) => g.inflationCost === 0)).toBe(true);
    expect(await status(api.get('/engine/planning?inflationRate=99'))).toBe(400);
  });

  it('creates goals, records contributions and auto-completes', async () => {
    const deadline = new Date(); deadline.setFullYear(deadline.getFullYear() + 1);
    const created = (await api.post('/goals', { name: 'Demo bike', targetAmount: 80000, currentAmount: 0, deadline: deadline.toISOString(), category: 'VEHICLE', priority: 'HIGH' })).data.data;
    expect(created.plan.inflationRate).toBe(5);
    expect(created.plan.requiredMonthly).toBeGreaterThan(0);

    const after = (await api.patch(`/goals/${created.id}/contribute`, { amount: 5000, note: 'first' })).data.data;
    expect(Number(after.currentAmount)).toBe(5000);
    expect(after.contributions).toHaveLength(1);
    expect(await status(api.patch(`/goals/${created.id}/contribute`, { amount: 0 }))).toBe(400);

    const done = (await api.patch(`/goals/${created.id}/contribute`, { amount: 100000 })).data.data;
    expect(done.status).toBe('COMPLETED');
    expect((await api.delete(`/goals/${created.id}`)).status).toBe(200);
  });

  it('imports every section and skips duplicates on re-upload', async () => {
    const today = new Date();
    const payload = {
      expenses: [{ category: 'FOOD', amount: 123, description: 'Demo import', paymentMethod: 'UPI', isRecurring: false, spentAt: iso(today) }],
      incomes: [{ source: 'Demo gig', amount: 2500, frequency: 'ONE_TIME', isRecurring: false, receivedAt: iso(today) }],
      obligations: [{ name: 'Demo OTT', type: 'SUBSCRIPTION', amount: 199, dueDate: iso(new Date(today.getTime() + 5 * 86400000)), frequency: 'MONTHLY', isRecurring: true, isPaid: false }],
      goals: [{ name: 'Demo camera', targetAmount: 60000, currentAmount: 0, deadline: null, category: 'GADGET', priority: 'LOW', inflationRate: null }],
      budgets: [{ month: today.getMonth() + 1, year: today.getFullYear(), totalBudget: null, categories: [{ category: 'TRAVEL', limit: 4000 }] }],
      options: { skipDuplicates: true },
    };
    const first = (await api.post('/import', payload)).data.data;
    expect(first.created).toEqual({ expenses: 1, incomes: 1, obligations: 1, goals: 1, budgets: 1 });
    const second = (await api.post('/import', payload)).data.data;
    expect(second.skipped.expenses).toBe(1);
    expect(second.skipped.goals).toBe(1);
    expect(second.created.expenses).toBe(0);

    const store = loadMockStore();
    expect(store.expenses.some((e) => e.description === 'Demo import')).toBe(true);
    const budgets = (await api.get('/budgets')).data.data;
    expect(Array.isArray(budgets) && budgets.length).toBeTruthy();
    expect(await status(api.post('/import', { options: { skipDuplicates: true } }))).toBe(400);
  });

  it('gives rule-based advice with per-goal savings amounts offline', async () => {
    const res = (await api.post('/ai/recommendations', { context: 'How much should I save for my goals?' })).data.data;
    expect(res.source).toBe('rules');
    expect(res.insights.length).toBeGreaterThanOrEqual(3);
    expect(res.insights.some((i: { detail: string }) => /Save ₹[\d,]+\/month/.test(i.detail))).toBe(true);
    expect(res.goalPlans.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown routes and blocks real-account auth actions', async () => {
    expect(await status(api.get('/nope'))).toBe(404);
    expect(await status(api.post('/auth/register', { email: 'x@y.z' }))).toBe(400);
  });
});
