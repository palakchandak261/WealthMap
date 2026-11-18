/**
 * WealthMap Demo Data Store (browser-only demo mode)
 * ──────────────────────────────────────────────────
 * Generates the SAME dataset as server/prisma/seed.ts, relative to today, so
 * demo mode and the real backend tell the same story:
 *   • 3 months of expense history + the current month
 *   • salary / freelance income, current-month budget, obligations
 *   • prioritised goals with monthly contribution history
 *
 * Everything lives in localStorage; the engines in demoEngine.ts compute every
 * number from it exactly like the backend does.
 */

import type {
  User, Income, Expense, Budget, Obligation, Goal, GoalContribution,
  GoalPriority, GoalStatus,
} from '../types';

export const DEMO_USER_ID = 'demo-user-123';
const STORE_VERSION = 2;
const MOCK_STORE_KEY = 'wm_demo_mock_data';

export interface MockStore {
  version: number;
  generatedFor: string;            // "YYYY-M" — data is regenerated each new month
  user: User;
  incomes: Income[];
  budgets: Budget[];
  expenses: Expense[];
  obligations: Obligation[];
  goals: Goal[];
  goalContributions: GoalContribution[];
}

type Method = Expense['paymentMethod'];
type Row = [day: number, category: string, amount: number, description: string, method: Method, recurring: boolean];

// Keep in sync with server/prisma/seed.ts
const MONTH_TEMPLATE: Row[] = [
  [1,  'RENT',          20000, 'Monthly apartment rent',            'NET_BANKING', true],
  [2,  'FOOD',           1850, 'Weekly groceries – Nature Basket',  'UPI',         false],
  [3,  'TRANSPORT',       450, 'Metro card recharge',               'UPI',         false],
  [4,  'ENTERTAINMENT',   499, 'Spotify + cloud storage',           'CARD',        true],
  [5,  'FOOD',            850, 'Team lunch with classmates',        'CARD',        false],
  [7,  'UTILITIES',      2100, 'Electricity & Wi-Fi bill',          'NET_BANKING', true],
  [9,  'TRANSPORT',       650, 'Uber to campus',                    'UPI',         false],
  [10, 'FOOD',           1850, 'Organic veggies & dairy',           'UPI',         false],
  [12, 'ENTERTAINMENT',   900, 'Movie night & snacks',              'CARD',        false],
  [14, 'SHOPPING',       1199, 'Reference textbooks & stationery',  'CARD',        false],
  [16, 'FOOD',            420, 'Café study session',                'UPI',         false],
  [18, 'FOOD',           1650, 'Weekly groceries',                  'UPI',         false],
  [21, 'TRANSPORT',       380, 'Auto rickshaw rides',               'CASH',        false],
  [23, 'SHOPPING',       1899, 'Running shoes',                     'CARD',        false],
  [25, 'FOOD',            950, 'Dinner with friends',               'UPI',         false],
  [27, 'HEALTH',          640, 'Pharmacy – vitamins',               'UPI',         false],
  [28, 'FOOD',           1500, 'Groceries top-up',                  'UPI',         false],
];

const HISTORY: { monthsAgo: number; factor: number; extra?: Row }[] = [
  { monthsAgo: 3, factor: 1.0 },
  { monthsAgo: 2, factor: 1.12, extra: [19, 'TRAVEL',   6500, 'Weekend trip to Lonavala', 'UPI',  false] },
  { monthsAgo: 1, factor: 1.06, extra: [20, 'SHOPPING', 3499, 'Festival shopping',        'CARD', false] },
];

const GOALS: {
  name: string; category: string; priority: GoalPriority; target: number; current: number;
  deadlineMonths: number; createdMonthsAgo: number; monthly: number; contributions: number; status?: GoalStatus;
}[] = [
  { name: 'Emergency Buffer Fund (6 Months)', category: 'EMERGENCY', priority: 'HIGH',   target: 180000, current: 110000, deadlineMonths: 8,  createdMonthsAgo: 10, monthly: 10000, contributions: 6 },
  { name: 'MBA / Higher Studies Fund',        category: 'EDUCATION', priority: 'HIGH',   target: 600000, current: 90000,  deadlineMonths: 36, createdMonthsAgo: 8,  monthly: 15000, contributions: 6 },
  { name: 'M4 MacBook Pro & Dev Setup',       category: 'GADGET',    priority: 'MEDIUM', target: 150000, current: 60000,  deadlineMonths: 10, createdMonthsAgo: 6,  monthly: 10000, contributions: 6 },
  { name: 'Japan Graduation Trip 🌸',          category: 'TRAVEL',    priority: 'MEDIUM', target: 250000, current: 75000,  deadlineMonths: 18, createdMonthsAgo: 5,  monthly: 9000,  contributions: 5 },
  { name: 'EV Car Down Payment',              category: 'VEHICLE',   priority: 'LOW',    target: 400000, current: 65000,  deadlineMonths: 40, createdMonthsAgo: 4,  monthly: 4000,  contributions: 4 },
  { name: 'New Smartphone',                   category: 'GADGET',    priority: 'LOW',    target: 45000,  current: 45000,  deadlineMonths: -1, createdMonthsAgo: 4,  monthly: 15000, contributions: 3, status: 'COMPLETED' },
];

const at = (y: number, m: number, d: number) => new Date(y, m, d, 12, 0, 0).toISOString();
const roundTo10 = (n: number) => Math.round(n / 10) * 10;
const monthsFromNow = (months: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + months, Math.min(now.getDate(), 28), 12);
};
const monthKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}`;

export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const INITIAL_DEMO_USER: User = {
  id: DEMO_USER_ID,
  name: 'Demo Student / User',
  email: 'demo@wealthmap.app',
  currency: 'INR',
  cashBalance: 85000,
  savingsBalance: 150000,
  emergencyFundBalance: 50000,
  declaredMonthlyIncome: 75000,
  onboardingComplete: true,
  createdAt: monthsFromNow(-10).toISOString(),
  updatedAt: new Date().toISOString(),
};

/** Build a fresh demo dataset relative to today. */
export const buildDemoStore = (): MockStore => {
  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth();
  const today = now.getDate();
  const stamp = now.toISOString();
  const uid = DEMO_USER_ID;

  // ── Expenses ────────────────────────────────────────────────────────────────
  const expenses: Expense[] = [];
  const pushExpense = (spentAt: string, [, category, amount, description, method, recurring]: Row, amt = amount) => {
    expenses.push({
      id: `exp-${expenses.length + 1}`, userId: uid, category, amount: amt, description,
      paymentMethod: method, isRecurring: recurring, spentAt, createdAt: spentAt, updatedAt: spentAt,
    });
  };
  for (const h of HISTORY) {
    const first = new Date(Y, M - h.monthsAgo, 1);
    const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (const row of [...MONTH_TEMPLATE, ...(h.extra ? [h.extra] : [])]) {
      pushExpense(at(first.getFullYear(), first.getMonth(), Math.min(row[0], daysIn)), row, row[5] ? row[2] : roundTo10(row[2] * h.factor));
    }
  }
  for (const row of MONTH_TEMPLATE) if (row[0] < today) pushExpense(at(Y, M, row[0]), row);
  pushExpense(at(Y, M, today), [today, 'FOOD', 180, 'Morning coffee', 'UPI', false]);
  expenses.sort((a, b) => b.spentAt.localeCompare(a.spentAt));

  // ── Incomes ─────────────────────────────────────────────────────────────────
  const incomes: Income[] = [];
  for (let k = 3; k >= 0; k--) {
    const d = new Date(Y, M - k, 1);
    const salaryAt = at(d.getFullYear(), d.getMonth(), 1);
    incomes.push({ id: `inc-${incomes.length + 1}`, userId: uid, source: 'Tech Internship / Salary', amount: 75000, frequency: 'MONTHLY', isRecurring: true, receivedAt: salaryAt, createdAt: salaryAt, updatedAt: salaryAt });
    if (k > 0 || today >= 10) {
      const freeAt = at(d.getFullYear(), d.getMonth(), 10);
      incomes.push({ id: `inc-${incomes.length + 1}`, userId: uid, source: 'Freelance Design & Tutoring', amount: k === 2 ? 12000 : 15000, frequency: 'MONTHLY', isRecurring: false, receivedAt: freeAt, createdAt: freeAt, updatedAt: freeAt });
    }
  }
  incomes.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  // ── Budget (current month) ──────────────────────────────────────────────────
  const budgetId = `budget-${Y}-${M + 1}`;
  const limits: [string, number][] = [
    ['FOOD', 12000], ['RENT', 20000], ['TRANSPORT', 4000], ['ENTERTAINMENT', 5000],
    ['UTILITIES', 5000], ['SHOPPING', 6000], ['HEALTH', 3000],
  ];
  const budgets: Budget[] = [{
    id: budgetId, userId: uid, month: M + 1, year: Y, totalBudget: 55000,
    categoryBudgets: limits.map(([category, limit], i) => ({ id: `cb-${i + 1}`, budgetId, category, limit, createdAt: stamp, updatedAt: stamp })),
    createdAt: stamp, updatedAt: stamp,
  }];

  // ── Obligations ─────────────────────────────────────────────────────────────
  const ob = (id: string, name: string, type: Obligation['type'], amount: number, dueDate: string, frequency: Obligation['frequency'], isPaid = false): Obligation =>
    ({ id, userId: uid, name, type, amount, dueDate, frequency, isRecurring: true, isPaid, createdAt: stamp, updatedAt: stamp });
  const obligations: Obligation[] = [
    ob('obl-1', 'Apartment Rent', 'RENT', 20000, at(Y, M + 1, 1), 'MONTHLY'),
    ob('obl-2', 'Student Laptop EMI', 'EMI', 4500, today < 28 ? at(Y, M, 28) : at(Y, M + 1, 28), 'MONTHLY'),
    ob('obl-3', 'Mobile Postpaid Bill', 'BILL', 599, new Date(now.getTime() + 5 * 86400000).toISOString(), 'MONTHLY'),
    ob('obl-4', 'Health & Medical Insurance', 'INSURANCE', 12000, new Date(now.getTime() + 40 * 86400000).toISOString(), 'YEARLY'),
    ob('obl-5', 'Gym & Sports Membership', 'SUBSCRIPTION', 1500, at(Y, M, Math.min(today, 25)), 'MONTHLY', true),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // ── Goals + contribution history ────────────────────────────────────────────
  const goals: Goal[] = [];
  const goalContributions: GoalContribution[] = [];
  GOALS.forEach((g, i) => {
    const id = `goal-${i + 1}`;
    goals.push({
      id, userId: uid, name: g.name, targetAmount: g.target, currentAmount: g.current,
      deadline: monthsFromNow(g.deadlineMonths).toISOString(), status: g.status ?? 'ACTIVE',
      category: g.category, priority: g.priority, inflationRate: null,
      createdAt: monthsFromNow(-g.createdMonthsAgo).toISOString(), updatedAt: stamp,
    });
    for (let k = 0; k < g.contributions; k++) {
      goalContributions.push({
        id: `gc-${i + 1}-${k + 1}`, goalId: id, userId: uid, amount: g.monthly, note: 'Monthly auto-save',
        contributedAt: new Date(monthsFromNow(-k).getTime() - 86400000).toISOString(),
      });
    }
  });

  return {
    version: STORE_VERSION,
    generatedFor: monthKey(now),
    user: { ...INITIAL_DEMO_USER, updatedAt: stamp },
    incomes, budgets, expenses, obligations, goals, goalContributions,
  };
};

export const saveMockStore = (store: MockStore) => {
  try {
    localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save demo data', e);
  }
};

export const resetMockStore = (): MockStore => {
  const fresh = buildDemoStore();
  saveMockStore(fresh);
  return fresh;
};

export const clearMockStore = () => {
  try { localStorage.removeItem(MOCK_STORE_KEY); } catch { /* ignore */ }
};

/** Load the demo store; regenerates it when the format changed or a new month began. */
export const loadMockStore = (): MockStore => {
  try {
    const raw = localStorage.getItem(MOCK_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockStore;
      if (parsed?.version === STORE_VERSION && parsed.generatedFor === monthKey() && Array.isArray(parsed.expenses)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Demo data was unreadable — regenerating', err);
  }
  return resetMockStore();
};
