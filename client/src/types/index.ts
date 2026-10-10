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
  userId: string;
  month: number;
  year: number;
  declaredMonthlyIncome: number;
  totalIncomeThisMonth: number;
  cashBalance: number;
  savingsBalance: number;
  emergencyFundBalance: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallUtilization: number;
  categories: FinancialCategoryState[];
  avgDailySpending: number;
  daysPassedInMonth: number;
  daysRemainingInMonth: number;
  totalDaysInMonth: number;
  upcomingObligations: Obligation[];
  totalUpcomingAmount: number;
  safeSpendableAmount: number;
  safeDailySpending: number;
  activeGoals: { id: string; name: string; progress: number; remaining: number }[];
}

export interface FinancialCategoryState {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  utilization: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED' | 'EXCEEDED';
}

export interface ForecastResult {
  projectedMonthlyExpense: number;
  currentBudget: number;
  expectedExcess: number;
  willExceedBudget: boolean;
  previousAvgDailySpending: number;
  currentAvgDailySpending: number;
  velocityChangePercent: number;
  categoryForecasts: CategoryForecast[];
}

export interface CategoryForecast {
  category: string;
  budget: number;
  spent: number;
  projected: number;
  expectedExcess: number;
  willExceed: boolean;
}

export interface RiskResult {
  riskScore: number;
  riskLevel: RiskLevel;
  components: {
    budgetRisk: number;
    cashFlowRisk: number;
    obligationRisk: number;
    velocityRisk: number;
    goalRisk: number;
  };
  alerts: string[];
}

export interface RiskAlert {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export interface HealthScoreResult {
  total: number;
  grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  components: {
    budgetAdherence: HealthScoreComponent;
    cashBuffer: HealthScoreComponent;
    obligationCoverage: HealthScoreComponent;
    spendingStability: HealthScoreComponent;
    savingsRate: HealthScoreComponent;
    goalProgress: HealthScoreComponent;
  };
  insights: string[];
}

export interface HealthScoreComponent {
  score: number;
  explanation: string;
}

export interface SafeToSpendResult {
  safeSpendableAmount: number;
  safeDailySpending: number;
  daysRemaining: number;
  budgetRemaining: number;
  upcomingObligations: number;
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
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  weight: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SimulationResult {
  input: { amount: number; category?: string; description?: string };
  before: {
    riskScore: number;
    riskLevel: string;
    healthScore: number;
    healthGrade: string;
    projectedExpense: number;
    cashBalance: number;
    safeDaily: number;
    budgetRemaining: number;
  };
  after: {
    riskScore: number;
    riskLevel: string;
    healthScore: number;
    healthGrade: string;
    projectedExpense: number;
    cashBalance: number;
    safeDaily: number;
    budgetRemaining: number;
  };
  diff: {
    riskDelta: number;
    healthDelta: number;
    cashImpact: number;
    budgetImpact: number;
    projectedImpact: number;
  };
  verdict: string;
  safe: boolean;
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
  recommendations: string[];
  context: {
    riskScore: number;
    riskLevel: RiskLevel;
    healthScore: number;
    healthGrade: string;
    willExceedBudget: boolean;
  };
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
