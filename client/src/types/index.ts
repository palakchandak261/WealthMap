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
export type GoalPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type GoalCategory =
  | 'EMERGENCY' | 'EDUCATION' | 'TRAVEL' | 'GADGET' | 'VEHICLE'
  | 'HOME' | 'WEDDING' | 'HEALTH' | 'RETIREMENT' | 'OTHER';

export interface GoalContribution {
  id: string;
  goalId: string;
  userId?: string;
  amount: number;
  note?: string | null;
  contributedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string | null;
  status: GoalStatus;
  category?: GoalCategory | string;
  priority?: GoalPriority;
  inflationRate?: number | null;   // custom % p.a.; null → category default
  contributions?: GoalContribution[];
  plan?: GoalPlan;
  createdAt: string;
  updatedAt: string;
}

// ── Planning (inflation, goal plans, appreciation) ────────────────────────────

export type GoalPlanStatus = 'COMPLETED' | 'ON_TRACK' | 'BEHIND' | 'NOT_STARTED' | 'OVERDUE' | 'NO_DEADLINE';

export interface GoalPlan {
  goalId: string;
  name: string;
  category: GoalCategory;
  priority: GoalPriority;
  inflationRate: number;
  baseTarget: number;
  futureTarget: number;
  inflationCost: number;
  current: number;
  remaining: number;
  progressPct: number;
  deadline: string | null;
  monthsLeft: number | null;
  requiredMonthly: number | null;
  requiredMonthlyNoInflation: number | null;
  monthlyPace: number;
  projectedCompletion: string | null;
  monthsBehind: number;
  status: GoalPlanStatus;
  advice: string;
}

export interface GoalAllocation {
  goalId: string;
  name: string;
  priority: GoalPriority;
  required: number;
  allocated: number;
  shortfall: number;
  suggestedDeadline: string | null;
}

export interface SavingsPlan {
  monthlyCapacity: number;
  totalRequired: number;
  totalAllocated: number;
  surplus: number;
  shortfall: number;
  allocations: GoalAllocation[];
  summary: string;
}

export interface YearlyProjection {
  basis: 'HISTORY' | 'CURRENT_MONTH' | 'NONE';
  monthsOfHistory: number;
  monthlyBaseline: number;
  annualBaseline: number;
  blendedRate: number;
  categories: { category: string; monthly: number; annual: number; rate: number }[];
  projections: { years: number; label: string; annual: number; monthly: number; increase: number; increasePct: number }[];
  purchasingPower: { years: number; valueOfOneLakh: number }[];
}

export type AppreciationLevel = 'CHAMPION' | 'GREAT' | 'GOOD' | 'OVER' | 'NO_BUDGET';

export interface SpendingAppreciation {
  level: AppreciationLevel;
  eligible: boolean;
  title: string;
  message: string;
  monthlySafeAllowance: number;
  dailyAllowance: number;
  allowanceToDate: number;
  discretionarySpent: number;
  savedSoFar: number;
  savedPct: number;
  todaySpent: number;
  todayRemaining: number;
  streakDays: number;
  daysWithinLimit: number;
  daysPassed: number;
  projectedMonthEndSaving: number;
  suggestion: string | null;
}

export interface PlanningSnapshot {
  inflationRate: number | null;
  monthlyIncome: number;
  expectedMonthlySpend: number;
  dueThisMonth: number;
  monthlySavingsCapacity: number;
  goalPlans: GoalPlan[];
  savingsPlan: SavingsPlan;
  yearlyProjection: YearlyProjection;
  appreciation: SpendingAppreciation | null;
}

// ── Import (CSV / Excel / JSON) ───────────────────────────────────────────────

export interface ImportCounts {
  expenses: number;
  incomes: number;
  obligations: number;
  goals: number;
  budgets: number;
}

export interface ImportResult {
  created: ImportCounts;
  skipped: ImportCounts;
  total: number;
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
  upcomingObligations: Pick<Obligation, 'id' | 'name' | 'amount' | 'dueDate' | 'type'>[];
  totalUpcomingAmount: number;
  dueThisMonthAmount?: number;
  fixedSpent?: number;
  discretionarySpent?: number;
  safeSpendableAmount: number;
  safeDailySpending: number;
  activeGoals: { id: string; name: string; progress: number; remaining: number }[];
  appreciation?: SpendingAppreciation;
}

export interface FinancialCategoryState {
  category: string;
  budget: number;
  spent: number;
  fixedSpent?: number;
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
  dueThisMonth?: number;
  appreciation?: SpendingAppreciation | null;
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

export type InsightCategory = 'GOAL' | 'SAVING' | 'SPENDING' | 'INFLATION' | 'RISK' | 'APPRECIATION';

export interface AIInsight {
  title: string;
  detail: string;
  category: InsightCategory;
  amount?: number | null;
}

export interface AIRecommendation {
  summary?: string;
  insights?: AIInsight[];
  recommendations: string[];
  source?: 'gemini' | 'openai' | 'rules';
  model?: string | null;
  fallbackReason?: string;
  goalPlans?: GoalPlan[];
  savingsPlan?: SavingsPlan;
  appreciation?: SpendingAppreciation | null;
  yearly?: { annualBaseline: number; nextYear: number; blendedRate: number };
  context: {
    riskScore: number;
    riskLevel: RiskLevel;
    healthScore: number;
    healthGrade: string;
    willExceedBudget: boolean;
    monthlySavingsCapacity?: number;
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
