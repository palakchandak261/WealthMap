/**
 * WealthMap Demo & Mock Data Store
 * Provides realistic, comprehensive mock financial data for instant demoing,
 * offline presentations, and automated fallback when the backend or database is offline.
 */

import type {
  User, Income, Expense, Budget, Obligation, Goal,
  FinancialState, ForecastResult, RiskResult, HealthScoreResult,
  DependencyGraph
} from '../types';

export const INITIAL_DEMO_USER: User = {
  id: 'demo-user-123',
  name: 'Demo Student / User',
  email: 'demo@wealthmap.app',
  currency: 'INR',
  cashBalance: 85000,
  savingsBalance: 150000,
  emergencyFundBalance: 50000,
  declaredMonthlyIncome: 75000,
  onboardingComplete: true,
  createdAt: new Date('2026-08-01').toISOString(),
  updatedAt: new Date().toISOString(),
};

export const INITIAL_DEMO_INCOMES: Income[] = [
  {
    id: 'inc-1',
    userId: 'demo-user-123',
    source: 'Tech Internship / Salary',
    amount: 75000,
    frequency: 'MONTHLY',
    isRecurring: true,
    receivedAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inc-2',
    userId: 'demo-user-123',
    source: 'Freelance Design & Tutoring',
    amount: 15000,
    frequency: 'MONTHLY',
    isRecurring: false,
    receivedAt: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_DEMO_BUDGET: Budget = {
  id: 'b-1',
  userId: 'demo-user-123',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  totalBudget: 52000,
  categoryBudgets: [
    { id: 'cb-1', budgetId: 'b-1', category: 'FOOD', limit: 12000, createdAt: '', updatedAt: '' },
    { id: 'cb-2', budgetId: 'b-1', category: 'RENT', limit: 20000, createdAt: '', updatedAt: '' },
    { id: 'cb-3', budgetId: 'b-1', category: 'TRANSPORT', limit: 4000, createdAt: '', updatedAt: '' },
    { id: 'cb-4', budgetId: 'b-1', category: 'ENTERTAINMENT', limit: 5000, createdAt: '', updatedAt: '' },
    { id: 'cb-5', budgetId: 'b-1', category: 'UTILITIES', limit: 5000, createdAt: '', updatedAt: '' },
    { id: 'cb-6', budgetId: 'b-1', category: 'SHOPPING', limit: 6000, createdAt: '', updatedAt: '' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const d = (daysAgo: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString();
};

export const INITIAL_DEMO_EXPENSES: Expense[] = [
  { id: 'exp-1', userId: 'demo-user-123', category: 'RENT', amount: 20000, description: 'Monthly Apartment Rent', paymentMethod: 'NET_BANKING', isRecurring: true, spentAt: d(18), createdAt: d(18), updatedAt: d(18) },
  { id: 'exp-2', userId: 'demo-user-123', category: 'FOOD', amount: 2450, description: 'Weekly groceries at Nature Basket', paymentMethod: 'UPI', isRecurring: false, spentAt: d(16), createdAt: d(16), updatedAt: d(16) },
  { id: 'exp-3', userId: 'demo-user-123', category: 'TRANSPORT', amount: 650, description: 'Uber to University Campus', paymentMethod: 'UPI', isRecurring: false, spentAt: d(14), createdAt: d(14), updatedAt: d(14) },
  { id: 'exp-4', userId: 'demo-user-123', category: 'FOOD', amount: 1200, description: 'Team lunch with classmates', paymentMethod: 'CARD', isRecurring: false, spentAt: d(12), createdAt: d(12), updatedAt: d(12) },
  { id: 'exp-5', userId: 'demo-user-123', category: 'UTILITIES', amount: 2100, description: 'Electricity & High-speed WiFi Bill', paymentMethod: 'NET_BANKING', isRecurring: true, spentAt: d(10), createdAt: d(10), updatedAt: d(10) },
  { id: 'exp-6', userId: 'demo-user-123', category: 'ENTERTAINMENT', amount: 1500, description: 'IMAX Cinema & Snacks', paymentMethod: 'CARD', isRecurring: false, spentAt: d(8), createdAt: d(8), updatedAt: d(8) },
  { id: 'exp-7', userId: 'demo-user-123', category: 'FOOD', amount: 1850, description: 'Organic veggies & dairy groceries', paymentMethod: 'UPI', isRecurring: false, spentAt: d(6), createdAt: d(6), updatedAt: d(6) },
  { id: 'exp-8', userId: 'demo-user-123', category: 'SHOPPING', amount: 1499, description: 'Reference textbooks & stationery', paymentMethod: 'CARD', isRecurring: false, spentAt: d(4), createdAt: d(4), updatedAt: d(4) },
  { id: 'exp-9', userId: 'demo-user-123', category: 'TRANSPORT', amount: 450, description: 'Metro card monthly recharge', paymentMethod: 'UPI', isRecurring: false, spentAt: d(3), createdAt: d(3), updatedAt: d(3) },
  { id: 'exp-10', userId: 'demo-user-123', category: 'FOOD', amount: 420, description: 'Café coffee & snacks study session', paymentMethod: 'UPI', isRecurring: false, spentAt: d(1), createdAt: d(1), updatedAt: d(1) },
  { id: 'exp-11', userId: 'demo-user-123', category: 'ENTERTAINMENT', amount: 499, description: 'Spotify + Cloud Storage Subscription', paymentMethod: 'CARD', isRecurring: true, spentAt: d(20), createdAt: d(20), updatedAt: d(20) },
];

export const INITIAL_DEMO_OBLIGATIONS: Obligation[] = [
  { id: 'obl-1', userId: 'demo-user-123', name: 'Apartment Rent', type: 'RENT', amount: 20000, dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(), frequency: 'MONTHLY', isRecurring: true, isPaid: false, createdAt: '', updatedAt: '' },
  { id: 'obl-2', userId: 'demo-user-123', name: 'Student Laptop EMI', type: 'EMI', amount: 4500, dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 28).toISOString(), frequency: 'MONTHLY', isRecurring: true, isPaid: false, createdAt: '', updatedAt: '' },
  { id: 'obl-3', userId: 'demo-user-123', name: 'Health & Medical Insurance', type: 'INSURANCE', amount: 12000, dueDate: new Date(new Date().getFullYear(), 11, 15).toISOString(), frequency: 'YEARLY', isRecurring: true, isPaid: false, createdAt: '', updatedAt: '' },
  { id: 'obl-4', userId: 'demo-user-123', name: 'Gym & Sports Membership', type: 'SUBSCRIPTION', amount: 1500, dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString(), frequency: 'MONTHLY', isRecurring: true, isPaid: true, createdAt: '', updatedAt: '' },
];

export const INITIAL_DEMO_GOALS: Goal[] = [
  {
    id: 'goal-1',
    userId: 'demo-user-123',
    name: 'Emergency Buffer Fund (6 Months)',
    targetAmount: 180000,
    currentAmount: 110000,
    deadline: '2026-12-31T00:00:00.000Z',
    status: 'ACTIVE',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-2',
    userId: 'demo-user-123',
    name: 'M4 MacBook Pro & Dev Setup',
    targetAmount: 150000,
    currentAmount: 60000,
    deadline: '2027-08-31T00:00:00.000Z',
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-3',
    userId: 'demo-user-123',
    name: 'Japan Graduation Trip 🌸',
    targetAmount: 250000,
    currentAmount: 75000,
    deadline: '2028-04-15T00:00:00.000Z',
    status: 'ACTIVE',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-4',
    userId: 'demo-user-123',
    name: 'EV Car Down Payment',
    targetAmount: 400000,
    currentAmount: 65000,
    deadline: '2029-12-31T00:00:00.000Z',
    status: 'ACTIVE',
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

// Helper to calculate mock engine metrics dynamically from mock data
export const computeMockFinancialState = (
  expenses: Expense[] = INITIAL_DEMO_EXPENSES,
  budget: Budget = INITIAL_DEMO_BUDGET,
  obligations: Obligation[] = INITIAL_DEMO_OBLIGATIONS,
  goals: Goal[] = INITIAL_DEMO_GOALS
): FinancialState => {
  const totalBudget = budget.totalBudget;
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalRemaining = Math.max(totalBudget - totalSpent, 0);

  const now = new Date();
  const passed = Math.max(now.getDate(), 1);
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(totalDays - passed, 1);
  const avgDaily = Math.round(totalSpent / passed);

  const unpaidObligations = obligations.filter(o => !o.isPaid);
  const totalUpcomingAmount = unpaidObligations.reduce((s, o) => s + Number(o.amount), 0);

  const buffer = Math.max(totalBudget * 0.10, 500);
  const safeSpendableAmount = Math.max(totalRemaining - totalUpcomingAmount - buffer, 0);
  const safeDailySpending = Math.max(Math.round(safeSpendableAmount / remainingDays), 600);

  const categories = budget.categoryBudgets.map(cb => {
    const catSpent = expenses
      .filter(e => e.category === cb.category)
      .reduce((s, e) => s + Number(e.amount), 0);
    const rem = cb.limit - catSpent;
    const util = cb.limit > 0 ? Math.round((catSpent / cb.limit) * 100) : 0;
    return {
      category: cb.category,
      budget: cb.limit,
      spent: catSpent,
      remaining: rem,
      utilization: util,
      status: (util > 100 ? 'EXCEEDED' : util >= 90 ? 'CRITICAL' : util >= 75 ? 'WARNING' : 'NORMAL') as any,
    };
  });

  return {
    userId: 'demo-user-123',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    declaredMonthlyIncome: 75000,
    totalIncomeThisMonth: 90000,
    cashBalance: 85000,
    savingsBalance: 150000,
    emergencyFundBalance: 50000,
    totalBudget,
    totalSpent,
    totalRemaining,
    overallUtilization: Math.round((totalSpent / totalBudget) * 100),
    categories,
    avgDailySpending: avgDaily,
    daysPassedInMonth: passed,
    daysRemainingInMonth: remainingDays,
    totalDaysInMonth: totalDays,
    upcomingObligations: unpaidObligations,
    totalUpcomingAmount,
    safeSpendableAmount,
    safeDailySpending,
    activeGoals: goals.filter(g => g.status === 'ACTIVE').map(g => ({
      id: g.id,
      name: g.name,
      progress: Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)),
      remaining: Math.max(g.targetAmount - g.currentAmount, 0),
    })),
  };
};

export const getMockRisk = (state: FinancialState): RiskResult => {
  const isSafe = state.avgDailySpending <= state.safeDailySpending;
  return {
    riskScore: isSafe ? 24 : 45,
    riskLevel: isSafe ? 'LOW' : 'MODERATE',
    components: {
      budgetRisk: 22,
      cashFlowRisk: 20,
      obligationRisk: 30,
      velocityRisk: 25,
      goalRisk: 22,
    },
    alerts: [
      '✅ Safe-to-Spend Discipline: Spending is comfortably below your daily recommended allowance!',
      'ℹ️ Upcoming laptop EMI of ₹4,500 due on 28th — funds are fully reserved in safe balance.',
      '🎯 Goals tracking strong: Emergency fund is over 60% funded.',
    ],
  };
};

export const getMockHealth = (): HealthScoreResult => ({
  total: 88,
  grade: 'EXCELLENT',
  components: {
    budgetAdherence: { score: 90, explanation: 'Spending is strictly inside planned category limits' },
    cashBuffer: { score: 85, explanation: 'Liquid cash reserves cover 3.2 months of fixed expenses' },
    obligationCoverage: { score: 92, explanation: 'Obligations are under 28% of monthly income' },
    spendingStability: { score: 86, explanation: 'Low volatility in daily discretionary spending' },
    savingsRate: { score: 84, explanation: 'Net savings rate is approximately 32% of monthly earnings' },
    goalProgress: { score: 91, explanation: 'Regular automated contributions on schedule' },
  },
  insights: [
    'Excellent financial discipline! Your daily spending is well within your safe-to-spend allowance.',
    'At current savings velocity, you can accelerate your Tech Upgrade goal by 2 months.',
    'Consider inflation-indexing your 2028 graduation trip target by 6% annually.',
  ],
});

export const getMockForecast = (state: FinancialState): ForecastResult => {
  const projected = state.avgDailySpending * state.totalDaysInMonth;
  return {
    projectedMonthlyExpense: projected,
    currentBudget: state.totalBudget,
    expectedExcess: Math.max(projected - state.totalBudget, 0),
    willExceedBudget: projected > state.totalBudget,
    previousAvgDailySpending: 1650,
    currentAvgDailySpending: state.avgDailySpending,
    velocityChangePercent: -12, // 12% reduced spending = positive discipline!
    categoryForecasts: state.categories.map(c => ({
      category: c.category,
      budget: c.budget,
      spent: c.spent,
      projected: Math.round(c.spent * 1.3),
      expectedExcess: Math.max(Math.round(c.spent * 1.3) - c.budget, 0),
      willExceed: Math.round(c.spent * 1.3) > c.budget,
    })),
  };
};

export const getMockDependencyGraph = (): DependencyGraph => ({
  nodes: [
    { id: '1', type: 'INCOME', label: 'Salary + Freelance (₹90,000)', value: 90000, position: { x: 50, y: 150 } },
    { id: '2', type: 'CASH', label: 'Liquid Cash (₹85,000)', value: 85000, position: { x: 300, y: 150 } },
    { id: '3', type: 'RENT', label: 'Apartment Rent (₹20,000)', value: 20000, position: { x: 550, y: 50 } },
    { id: '4', type: 'EMI', label: 'Laptop EMI (₹4,500)', value: 4500, position: { x: 550, y: 130 } },
    { id: '5', type: 'EXPENSES', label: 'Discretionary Expenses (₹7,900)', value: 7900, position: { x: 550, y: 210 } },
    { id: '6', type: 'SAVINGS', label: 'Goals & Savings (₹150,000)', value: 150000, position: { x: 550, y: 290 } },
    { id: '7', type: 'RISK', label: 'Risk Score (24/100 LOW)', value: 24, position: { x: 800, y: 150 } },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2', relationship: 'deposits_into', weight: 1.0, severity: 'LOW' },
    { id: 'e2', source: '2', target: '3', relationship: 'funds', weight: 0.23, severity: 'MEDIUM' },
    { id: 'e3', source: '2', target: '4', relationship: 'funds', weight: 0.05, severity: 'LOW' },
    { id: 'e4', source: '2', target: '5', relationship: 'funds', weight: 0.09, severity: 'LOW' },
    { id: 'e5', source: '2', target: '6', relationship: 'funds', weight: 0.35, severity: 'LOW' },
    { id: 'e6', source: '5', target: '7', relationship: 'mitigates', weight: 0.1, severity: 'LOW' },
  ],
});

// Local storage keys
const MOCK_STORE_KEY = 'wm_demo_mock_data';

export interface MockStore {
  user: User;
  incomes: Income[];
  budget: Budget;
  expenses: Expense[];
  obligations: Obligation[];
  goals: Goal[];
}

export const loadMockStore = (): MockStore => {
  try {
    const raw = localStorage.getItem(MOCK_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse mock store, resetting', err);
  }
  const initial: MockStore = {
    user: INITIAL_DEMO_USER,
    incomes: INITIAL_DEMO_INCOMES,
    budget: INITIAL_DEMO_BUDGET,
    expenses: INITIAL_DEMO_EXPENSES,
    obligations: INITIAL_DEMO_OBLIGATIONS,
    goals: INITIAL_DEMO_GOALS,
  };
  saveMockStore(initial);
  return initial;
};

export const saveMockStore = (store: MockStore) => {
  try {
    localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save mock store', e);
  }
};

export const resetMockStore = (): MockStore => {
  const fresh: MockStore = {
    user: INITIAL_DEMO_USER,
    incomes: INITIAL_DEMO_INCOMES,
    budget: INITIAL_DEMO_BUDGET,
    expenses: INITIAL_DEMO_EXPENSES,
    obligations: INITIAL_DEMO_OBLIGATIONS,
    goals: INITIAL_DEMO_GOALS,
  };
  saveMockStore(fresh);
  return fresh;
};
