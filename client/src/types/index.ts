// ── Types mirroring the backend Prisma schema & API response shapes ──────────

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  cashBalance: number;
  savingsBalance: number;
  emergencyFundBalance: number;
  declaredMonthlyIncome: number;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  userId: string;
  source: string;
  amount: number;
  frequency: 'ONE_TIME' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  isRecurring: boolean;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  category: string;
  amount: number;
  description?: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'OTHER';
  isRecurring: boolean;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  month: number;
  year: number;
  totalBudget: number;
  categoryBudgets: CategoryBudget[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudget {
  id: string;
  budgetId: string;
  category: string;
  limit: number;
  createdAt: string;
  updatedAt: string;
}

export type ObligationType = 'EMI' | 'RENT' | 'BILL' | 'SUBSCRIPTION' | 'INSURANCE' | 'LOAN' | 'OTHER';
export type Frequency = 'ONE_TIME' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Obligation {
  id: string;
  userId: string;
  name: string;
  type: ObligationType;
  amount: number;
  dueDate: string;
  frequency: Frequency;
  isRecurring: boolean;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ABANDONED';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Engine / Intelligence types ───────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface FinancialState {
  income: { monthly: number; ytd: number };
  budget: { total: number; spent: number; remaining: number; utilizationPct: number };
  cashFlow: { cashBalance: number; projectedMonthEnd: number };
  obligations: { total: number; upcoming: Obligation[] };
  goals: { count: number; totalTarget: number; totalSaved: number };
  risk: { score: number; level: RiskLevel };
  healthScore: number;
  safeToSpend: number;
}

export interface ForecastResult {
  projectedMonthlyExpense: number;
  currentSpend: number;
  daysElapsed: number;
  daysInMonth: number;
  avgDailySpend: number;
  potentialOverrun: number;
  categories: CategoryForecast[];
  spendingVelocity: number;
}

export interface CategoryForecast {
  category: string;
  spent: number;
  limit: number;
  projected: number;
  overrun: number;
  utilizationPct: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL_WARNING' | 'LIMIT_REACHED' | 'EXCEEDED';
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  breakdown: {
    budget: number;
    cashFlow: number;
    obligation: number;
    velocity: number;
    goal: number;
  };
  alerts: RiskAlert[];
}

export interface RiskAlert {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export interface HealthScoreResult {
  overall: number;
  breakdown: {
    budgetAdherence: number;
    cashBuffer: number;
    obligationCoverage: number;
    spendingStability: number;
    savings: number;
    goalProgress: number;
  };
}

export interface SafeToSpendResult {
  safeToSpend: number;
  remainingBudget: number;
  obligations: number;
  buffer: number;
  daysLeft: number;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphNodeType = 'INCOME' | 'CASH' | 'BUDGET' | 'EXPENSES' | 'SAVINGS' | 'BUFFER' | 'EMI' | 'RENT' | 'DEBT' | 'GOALS' | 'RISK';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  value?: number;
  positionX: number;
  positionY: number;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  weight: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SimulationResult {
  current: { balance: number; riskScore: number; healthScore: number; budgetRemaining: number };
  simulated: { balance: number; riskScore: number; healthScore: number; budgetRemaining: number };
  delta: { balance: number; riskScore: number; healthScore: number; budgetRemaining: number };
  affectedGoals: { goalId: string; name: string; impact: string }[];
  affectedObligations: { obligationId: string; name: string; impact: string }[];
  warnings: string[];
}

export interface AnomalyResult {
  anomalies: Anomaly[];
}

export interface Anomaly {
  category: string;
  amount: number;
  zscore: number;
  date: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AIRecommendation {
  summary: string;
  recommendations: string[];
  priorityActions: string[];
}

// ── API wrapper types ─────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
