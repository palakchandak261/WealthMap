import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  inflate, buildGoalPlan, monthsToReach, buildSavingsPlan, buildYearlyProjection,
  buildAppreciation, isFixedExpense, GOAL_CATEGORY_INFLATION,
} from '../finance';

const NOW = new Date(2026, 10, 15, 12, 0, 0); // 15 Nov 2026

describe('finance mirror', () => {
  it('client copy is identical to the server finance engine (apart from the header note)', () => {
    const strip = (s: string) => s.replace(/\r\n/g, '\n').split('\n').filter((l) => !l.includes('⚠ Mirror')).join('\n');
    const client = readFileSync(resolve(__dirname, '../finance.ts'), 'utf8');
    const server = readFileSync(resolve(__dirname, '../../../../server/src/lib/finance.ts'), 'utf8');
    expect(strip(client)).toBe(strip(server));
  });
});

describe('inflation', () => {
  it('compounds yearly', () => {
    expect(inflate(100000, 6, 1)).toBeCloseTo(106000, 0);
    expect(inflate(100000, 6, 2)).toBeCloseTo(112360, 0);
    expect(inflate(100000, 0, 5)).toBe(100000);
  });
});

describe('goal plan', () => {
  const base = {
    id: 'g1', name: 'MacBook', targetAmount: 120000, currentAmount: 20000,
    deadline: new Date(2027, 10, 15, 12), status: 'ACTIVE', category: 'GADGET', priority: 'HIGH' as const,
    inflationRate: null, createdAt: new Date(2026, 4, 1), contributions: [],
  };

  it('inflates the target by the category rate and asks for a monthly amount', () => {
    const p = buildGoalPlan(base, { now: NOW });
    expect(p.inflationRate).toBe(GOAL_CATEGORY_INFLATION.GADGET);
    expect(p.futureTarget).toBeGreaterThan(120000);
    expect(p.monthsLeft).toBe(12);
    expect(p.requiredMonthly).toBe(Math.ceil((p.futureTarget - 20000) / 12));
    expect(p.requiredMonthlyNoInflation).toBe(Math.ceil(100000 / 12));
  });

  it('respects a flat rate and inflation switched off', () => {
    expect(buildGoalPlan(base, { now: NOW, flatRate: 10 }).inflationRate).toBe(10);
    const off = buildGoalPlan(base, { now: NOW, inflationEnabled: false });
    expect(off.futureTarget).toBe(120000);
    expect(off.inflationCost).toBe(0);
  });

  it('needs nothing once the goal is funded', () => {
    const p = buildGoalPlan({ ...base, currentAmount: 125000 }, { now: NOW });
    expect(p.status).toBe('COMPLETED');
    expect(p.requiredMonthly).toBe(0);
  });

  it('flags a goal as BEHIND when the saving pace is too slow', () => {
    // ₹6,000/month for the last 6 months → finishes in ~17 months, deadline is 12 months away
    const contributions = [0, 1, 2, 3, 4, 5].map((i) => ({ amount: 6000, contributedAt: new Date(2026, 10 - i, 5) }));
    const p = buildGoalPlan({ ...base, contributions }, { now: NOW });
    expect(p.status).toBe('BEHIND');
    expect(p.monthsBehind).toBeGreaterThan(0);
  });

  it('is BEHIND (not "not started") when saving too little to ever catch up', () => {
    const contributions = [{ amount: 1000, contributedAt: new Date(2026, 9, 5) }];
    const p = buildGoalPlan({ ...base, contributions }, { now: NOW });
    expect(p.status).toBe('BEHIND');
    expect(p.advice).toMatch(/won't catch up/);
  });

  it('is NOT_STARTED with no savings at all', () => {
    const p = buildGoalPlan({ ...base, currentAmount: 0 }, { now: NOW });
    expect(p.status).toBe('NOT_STARTED');
  });
});

describe('monthsToReach', () => {
  it('returns months needed, accounting for inflation', () => {
    expect(monthsToReach(12000, 0, 1000, 0)).toBe(12);
    expect(monthsToReach(12000, 0, 1000, 10)!).toBeGreaterThan(12);
    expect(monthsToReach(12000, 12000, 0, 6)).toBe(0);
    expect(monthsToReach(12000, 0, 0, 6)).toBeNull();
  });
});

describe('savings plan', () => {
  it('funds high-priority goals first and reports the shortfall', () => {
    const mk = (id: string, priority: 'HIGH' | 'LOW', target: number) => buildGoalPlan({
      id, name: id, targetAmount: target, currentAmount: 0, deadline: new Date(2027, 10, 15, 12),
      status: 'ACTIVE', category: 'OTHER', priority, inflationRate: 0, createdAt: NOW,
    }, { now: NOW });
    const plan = buildSavingsPlan([mk('low', 'LOW', 60000), mk('high', 'HIGH', 60000)], 6000, NOW);
    const high = plan.allocations.find((a) => a.goalId === 'high')!;
    const low = plan.allocations.find((a) => a.goalId === 'low')!;
    expect(high.allocated).toBe(5000);
    expect(low.allocated).toBe(1000);
    expect(plan.shortfall).toBe(4000);
  });
});

describe('yearly expense projection', () => {
  it('counts fixed costs once when projecting from the current month', () => {
    const expenses = [
      { category: 'RENT', amount: 20000, spentAt: new Date(2026, 10, 1), isRecurring: true },
      { category: 'FOOD', amount: 3000, spentAt: new Date(2026, 10, 10), isRecurring: false },
    ];
    const y = buildYearlyProjection(expenses, { now: NOW, daysPassed: 15, totalDays: 30 });
    // rent 20,000 + food projected to 6,000 → 26,000/month → 3,12,000/year
    expect(y.annualBaseline).toBe(312000);
    expect(y.projections.find((p) => p.years === 1)!.annual).toBeGreaterThan(312000);
  });
});

describe('appreciation', () => {
  const exp = (amount: number, day: number, category = 'FOOD') => ({ category, amount, spentAt: new Date(2026, 10, day, 12), isRecurring: false });

  it('celebrates spending under the safe-to-spend allowance', () => {
    const a = buildAppreciation({
      monthExpenses: [exp(20000, 1, 'RENT'), exp(300, 3), exp(500, 9)],
      totalBudget: 50000, dueThisMonthAmount: 0, daysPassed: 15, totalDays: 30, topGoalName: 'Trip', now: NOW,
    });
    expect(a.eligible).toBe(true);
    expect(a.level).toBe('CHAMPION');
    expect(a.savedSoFar).toBeGreaterThan(0);
    expect(a.suggestion).toContain('Trip');
  });

  it('nudges when spending is ahead of the safe pace', () => {
    const a = buildAppreciation({
      monthExpenses: [exp(30000, 2)], totalBudget: 40000, dueThisMonthAmount: 0, daysPassed: 15, totalDays: 30, now: NOW,
    });
    expect(a.eligible).toBe(false);
    expect(a.level).toBe('OVER');
  });

  it('treats rent / recurring as fixed, not discretionary', () => {
    expect(isFixedExpense({ category: 'RENT', isRecurring: false })).toBe(true);
    expect(isFixedExpense({ category: 'FOOD', isRecurring: true })).toBe(true);
    expect(isFixedExpense({ category: 'FOOD', isRecurring: false })).toBe(false);
  });
});
