/**
 * WealthMap — Database Seed
 * Creates the demo user (demo@wealthmap.app / Demo@1234) with a realistic,
 * date-relative financial footprint: 3 months of history, the current month,
 * prioritised goals with contribution history, budgets and obligations.
 *
 * The same dataset powers the browser-only demo (client/src/services/mockData.ts),
 * so normal mode and demo mode show the same story.
 *
 * Run with: npm run db:seed   (only resets the demo user — other accounts are untouched)
 */
import { PrismaClient, Frequency, ObligationType, GoalStatus, GoalPriority, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_EMAIL = 'demo@wealthmap.app';

type Row = [day: number, category: string, amount: number, description: string, method: PaymentMethod, recurring: boolean];

// Day-of-month template for a typical month
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

// Older months were a little more expensive → "spending slower than last month"
const HISTORY: { monthsAgo: number; factor: number; extra?: Row }[] = [
  { monthsAgo: 3, factor: 1.0 },
  { monthsAgo: 2, factor: 1.12, extra: [19, 'TRAVEL',   6500, 'Weekend trip to Lonavala', 'UPI',  false] },
  { monthsAgo: 1, factor: 1.06, extra: [20, 'SHOPPING', 3499, 'Festival shopping',        'CARD', false] },
];

const at = (y: number, m: number, d: number) => new Date(y, m, d, 12, 0, 0);
const roundTo10 = (n: number) => Math.round(n / 10) * 10;
const monthsFromNow = (months: number, day?: number) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + months, day ?? Math.min(now.getDate(), 28), 12);
  return d;
};

async function main() {
  // Reset only the demo user (cascades to all of their records)
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      name: 'Demo Student / User',
      email: DEMO_EMAIL,
      // bcrypt hash of "Demo@1234"
      passwordHash: '$2a$12$DF3subn.iol3eNpmxCn.9eg1lrJr3Q4cfjPDw4ja58E1w6uV1unem',
      currency: 'INR',
      cashBalance: '85000.00',
      savingsBalance: '150000.00',
      emergencyFundBalance: '50000.00',
      declaredMonthlyIncome: '75000.00',
      onboardingComplete: true,
      emailVerified: true,
      otpVerified: true,
    },
  });

  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth();          // 0-based
  const today = now.getDate();

  // ── Expenses ────────────────────────────────────────────────────────────────
  const expenses: { category: string; amount: number; description: string; paymentMethod: PaymentMethod; isRecurring: boolean; spentAt: Date }[] = [];
  for (const h of HISTORY) {
    const y = new Date(Y, M - h.monthsAgo, 1).getFullYear();
    const m = new Date(Y, M - h.monthsAgo, 1).getMonth();
    const daysIn = new Date(y, m + 1, 0).getDate();
    for (const [day, category, amount, description, method, recurring] of [...MONTH_TEMPLATE, ...(h.extra ? [h.extra] : [])]) {
      expenses.push({
        category, description, paymentMethod: method, isRecurring: recurring,
        amount: recurring ? amount : roundTo10(amount * h.factor),
        spentAt: at(y, m, Math.min(day, daysIn)),
      });
    }
  }
  // Current month: everything before today, plus a small coffee today
  for (const [day, category, amount, description, method, recurring] of MONTH_TEMPLATE) {
    if (day < today) expenses.push({ category, amount, description, paymentMethod: method, isRecurring: recurring, spentAt: at(Y, M, day) });
  }
  expenses.push({ category: 'FOOD', amount: 180, description: 'Morning coffee', paymentMethod: 'UPI', isRecurring: false, spentAt: at(Y, M, today) });
  await prisma.expense.createMany({ data: expenses.map((e) => ({ ...e, userId: user.id })) });

  // ── Incomes (salary on the 1st, freelance on the 10th) ─────────────────────
  const incomes: { source: string; amount: number; frequency: Frequency; isRecurring: boolean; receivedAt: Date }[] = [];
  for (let k = 3; k >= 0; k--) {
    const d = new Date(Y, M - k, 1);
    incomes.push({ source: 'Tech Internship / Salary', amount: 75000, frequency: 'MONTHLY', isRecurring: true, receivedAt: at(d.getFullYear(), d.getMonth(), 1) });
    if (k > 0 || today >= 10) {
      incomes.push({ source: 'Freelance Design & Tutoring', amount: k === 2 ? 12000 : 15000, frequency: 'MONTHLY', isRecurring: false, receivedAt: at(d.getFullYear(), d.getMonth(), 10) });
    }
  }
  await prisma.income.createMany({ data: incomes.map((i) => ({ ...i, userId: user.id })) });

  // ── Budget for the current month ────────────────────────────────────────────
  await prisma.budget.create({
    data: {
      userId: user.id, month: M + 1, year: Y, totalBudget: '55000.00',
      categoryBudgets: {
        create: [
          { category: 'FOOD', limit: '12000.00' },
          { category: 'RENT', limit: '20000.00' },
          { category: 'TRANSPORT', limit: '4000.00' },
          { category: 'ENTERTAINMENT', limit: '5000.00' },
          { category: 'UTILITIES', limit: '5000.00' },
          { category: 'SHOPPING', limit: '6000.00' },
          { category: 'HEALTH', limit: '3000.00' },
        ],
      },
    },
  });

  // ── Obligations ─────────────────────────────────────────────────────────────
  const emiDue = today < 28 ? at(Y, M, 28) : at(Y, M + 1, 28);
  await prisma.obligation.createMany({
    data: [
      { userId: user.id, name: 'Apartment Rent', type: ObligationType.RENT, amount: '20000.00', dueDate: at(Y, M + 1, 1), frequency: Frequency.MONTHLY, isRecurring: true },
      { userId: user.id, name: 'Student Laptop EMI', type: ObligationType.EMI, amount: '4500.00', dueDate: emiDue, frequency: Frequency.MONTHLY, isRecurring: true },
      { userId: user.id, name: 'Mobile Postpaid Bill', type: ObligationType.BILL, amount: '599.00', dueDate: new Date(now.getTime() + 5 * 86400000), frequency: Frequency.MONTHLY, isRecurring: true },
      { userId: user.id, name: 'Health & Medical Insurance', type: ObligationType.INSURANCE, amount: '12000.00', dueDate: new Date(now.getTime() + 40 * 86400000), frequency: Frequency.YEARLY, isRecurring: true },
      { userId: user.id, name: 'Gym & Sports Membership', type: ObligationType.SUBSCRIPTION, amount: '1500.00', dueDate: at(Y, M, Math.min(today, 25)), frequency: Frequency.MONTHLY, isRecurring: true, isPaid: true },
    ],
  });

  // ── Goals with priorities, categories & contribution history ────────────────
  const goals: {
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

  for (const g of goals) {
    await prisma.goal.create({
      data: {
        userId: user.id,
        name: g.name,
        category: g.category,
        priority: g.priority,
        targetAmount: g.target,
        currentAmount: g.current,
        deadline: monthsFromNow(g.deadlineMonths),
        status: g.status ?? GoalStatus.ACTIVE,
        createdAt: monthsFromNow(-g.createdMonthsAgo),
        contributions: {
          create: Array.from({ length: g.contributions }, (_, k) => ({
            userId: user.id,
            amount: g.monthly,
            note: 'Monthly auto-save',
            contributedAt: new Date(monthsFromNow(-k).getTime() - 86400000),
          })),
        },
      },
    });
  }

  console.log(`✔ WealthMap seed complete. Demo user ready: ${DEMO_EMAIL} / Demo@1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
