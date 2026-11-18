/**
 * Finance Planning Math (pure functions — no DB access)
 * ─────────────────────────────────────────────────────
 *  • Inflation:      FV = PV × (1 + r)^t
 *  • Goal planning:  inflation-adjusted target, required monthly saving,
 *                    pace-based projected completion, on-track status
 *  • Allocation:     split monthly savings capacity across goals by priority
 *  • Yearly expense: category-weighted inflation projection of living costs
 *  • Appreciation:   rewards spending below the safe-to-spend allowance
 *
 * ⚠ Mirrored in client/src/utils/finance.ts — keep both files identical so demo
 * mode (browser-only) produces exactly the same numbers as the real backend.
 */

export const GOAL_CATEGORIES = [
  "EMERGENCY", "EDUCATION", "TRAVEL", "GADGET", "VEHICLE",
  "HOME", "WEDDING", "HEALTH", "RETIREMENT", "OTHER",
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];
export type GoalPriority = "HIGH" | "MEDIUM" | "LOW";

/** Typical Indian planning assumptions (% per annum) for each goal type. */
export const GOAL_CATEGORY_INFLATION: Record<GoalCategory, number> = {
  EMERGENCY: 6, EDUCATION: 10, TRAVEL: 7, GADGET: 4, VEHICLE: 5,
  HOME: 7, WEDDING: 8, HEALTH: 12, RETIREMENT: 6, OTHER: 6,
};

/** Category-wise inflation used for yearly living-cost projections (% p.a.). */
export const EXPENSE_CATEGORY_INFLATION: Record<string, number> = {
  FOOD: 7, TRANSPORT: 6, SHOPPING: 5, ENTERTAINMENT: 5, HEALTH: 12,
  EDUCATION: 10, UTILITIES: 6, RENT: 7, EMI: 0, INSURANCE: 8, TRAVEL: 7, OTHER: 6,
};
export const DEFAULT_INFLATION = 6;

/** Expense categories that are commitments rather than day-to-day spending. */
export const FIXED_EXPENSE_CATEGORIES = ["RENT", "EMI", "INSURANCE"];

const MS_PER_DAY = 86_400_000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;
const PRIORITY_ORDER: Record<GoalPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export const round = (n: number) => Math.round(n);
export const inflate = (amount: number, ratePct: number, years: number) =>
  amount * Math.pow(1 + ratePct / 100, Math.max(years, 0));

export const normalizeGoalCategory = (c?: string | null): GoalCategory => {
  const up = String(c ?? "").trim().toUpperCase() as GoalCategory;
  return (GOAL_CATEGORIES as readonly string[]).includes(up) ? up : "OTHER";
};

/** Whole calendar months from `from` until `to` (min 1). */
export const monthsUntil = (to: Date, from = new Date()) =>
  Math.max((to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()), 1);

export const addMonths = (d: Date, months: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
};

export const isFixedExpense = (e: { category: string; isRecurring: boolean }) =>
  e.isRecurring || FIXED_EXPENSE_CATEGORIES.includes(e.category);

// ─────────────────────────────────────────────────────────────────────────────
// GOAL PLANNING
// ─────────────────────────────────────────────────────────────────────────────

export interface GoalInput {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date | string | null;
  status: string;
  category?: string | null;
  priority?: GoalPriority | null;
  inflationRate?: number | null;
  createdAt: Date | string;
  contributions?: { amount: number; contributedAt: Date | string }[];
}

export type GoalPlanStatus =
  | "COMPLETED" | "ON_TRACK" | "BEHIND" | "NOT_STARTED" | "OVERDUE" | "NO_DEADLINE";

export interface GoalPlan {
  goalId: string;
  name: string;
  category: GoalCategory;
  priority: GoalPriority;
  inflationRate: number;            // effective % p.a. used
  baseTarget: number;               // today's price
  futureTarget: number;             // price at deadline (inflation-adjusted)
  inflationCost: number;            // futureTarget − baseTarget
  current: number;
  remaining: number;                // futureTarget − current
  progressPct: number;              // vs futureTarget
  deadline: string | null;
  monthsLeft: number | null;
  requiredMonthly: number | null;   // save this much / month (with inflation)
  requiredMonthlyNoInflation: number | null;
  monthlyPace: number;              // avg contribution / month (last 6 months)
  projectedCompletion: string | null;
  monthsBehind: number;             // > 0 → late at current pace
  status: GoalPlanStatus;
  advice: string;
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const monthLabel = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/** Average monthly contribution over the last 6 months (or since goal creation). */
export const goalMonthlyPace = (goal: GoalInput, now = new Date()) => {
  const created = new Date(goal.createdAt);
  const monthsSinceCreated = Math.max((now.getTime() - created.getTime()) / (MS_PER_YEAR / 12), 1);
  const contributions = goal.contributions ?? [];
  if (contributions.length > 0) {
    const windowStart = new Date(now.getTime() - 182 * MS_PER_DAY);
    const recent = contributions.filter((c) => new Date(c.contributedAt) >= windowStart);
    const total = recent.reduce((s, c) => s + Number(c.amount), 0);
    return round(total / Math.min(6, monthsSinceCreated));
  }
  // No history yet → assume savings so far accrued evenly since creation
  return Number(goal.currentAmount) > 0 ? round(Number(goal.currentAmount) / monthsSinceCreated) : 0;
};

/**
 * Months needed to reach an inflating target when saving `monthly` each month.
 * Simulated month by month because the target keeps growing with inflation.
 */
export const monthsToReach = (target: number, current: number, monthly: number, ratePct: number, cap = 600) => {
  if (current >= target) return 0;
  if (monthly <= 0) return null;
  let saved = current;
  for (let m = 1; m <= cap; m++) {
    saved += monthly;
    if (saved >= inflate(target, ratePct, m / 12)) return m;
  }
  return null;
};

export const buildGoalPlan = (
  goal: GoalInput,
  opts: { inflationEnabled?: boolean; flatRate?: number | null; now?: Date } = {}
): GoalPlan => {
  const now = opts.now ?? new Date();
  const inflationEnabled = opts.inflationEnabled ?? true;
  const category = normalizeGoalCategory(goal.category);
  const priority = (goal.priority ?? "MEDIUM") as GoalPriority;
  const rate = !inflationEnabled ? 0
    : opts.flatRate != null ? opts.flatRate
    : goal.inflationRate != null ? Number(goal.inflationRate)
    : GOAL_CATEGORY_INFLATION[category];

  const baseTarget = Number(goal.targetAmount);
  const current = Number(goal.currentAmount);
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const yearsLeft = deadline ? Math.max((deadline.getTime() - now.getTime()) / MS_PER_YEAR, 0) : 0;
  const monthsLeft = deadline ? monthsUntil(deadline, now) : null;

  const isComplete = goal.status === "COMPLETED" || current >= baseTarget;
  // A funded goal is done — it no longer chases an inflating price
  const futureTarget = isComplete ? baseTarget : round(deadline ? inflate(baseTarget, rate, yearsLeft) : baseTarget);
  const remaining = Math.max(futureTarget - current, 0);
  const requiredMonthly = isComplete ? 0 : monthsLeft ? Math.ceil(remaining / monthsLeft) : null;
  const requiredMonthlyNoInflation = isComplete ? 0 : monthsLeft ? Math.ceil(Math.max(baseTarget - current, 0) / monthsLeft) : null;

  const monthlyPace = goalMonthlyPace(goal, now);
  const projMonths = monthsToReach(baseTarget, current, monthlyPace, rate);
  const projectedCompletion = projMonths != null ? addMonths(now, projMonths).toISOString() : null;

  let status: GoalPlanStatus;
  let monthsBehind = 0;
  if (isComplete) status = "COMPLETED";
  else if (!deadline) status = projMonths != null ? "ON_TRACK" : "NOT_STARTED";
  else if (deadline.getTime() < now.getTime()) status = "OVERDUE";
  else if (projMonths == null) status = monthlyPace > 0 ? "BEHIND" : "NOT_STARTED";   // saving, but too slowly to ever catch up
  else if (projMonths <= (monthsLeft ?? 0)) status = "ON_TRACK";
  else { status = "BEHIND"; monthsBehind = projMonths - (monthsLeft ?? 0); }
  if (!deadline && status === "ON_TRACK") status = "NO_DEADLINE";

  let advice: string;
  if (status === "COMPLETED") advice = `"${goal.name}" is fully funded — great job!`;
  else if (status === "OVERDUE") advice = `The deadline for "${goal.name}" has passed. Set a new date to get a fresh monthly plan.`;
  else if (requiredMonthly != null && deadline) {
    advice = `Save ${inr(requiredMonthly)}/month to reach "${goal.name}" by ${monthLabel(deadline)}` +
      (rate > 0 ? ` — the target grows to ${inr(futureTarget)} at ${rate}% inflation.` : ".");
    if (status === "BEHIND") advice += monthsBehind > 0
      ? ` At your current pace (${inr(monthlyPace)}/month) you'd be ${monthsBehind} month${monthsBehind === 1 ? "" : "s"} late.`
      : ` At your current pace (${inr(monthlyPace)}/month) you won't catch up with inflation.`;
  } else {
    advice = monthlyPace > 0 && projectedCompletion
      ? `At ${inr(monthlyPace)}/month you'll reach "${goal.name}" around ${monthLabel(new Date(projectedCompletion))}. Add a deadline for a precise plan.`
      : `Add a deadline to "${goal.name}" to get a monthly savings plan.`;
  }

  return {
    goalId: goal.id, name: goal.name, category, priority, inflationRate: rate,
    baseTarget, futureTarget, inflationCost: futureTarget - baseTarget, current, remaining,
    progressPct: futureTarget > 0 ? Math.min(100, Math.round((current / futureTarget) * 100)) : 0,
    deadline: deadline ? deadline.toISOString() : null, monthsLeft,
    requiredMonthly, requiredMonthlyNoInflation, monthlyPace, projectedCompletion,
    monthsBehind, status, advice,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SAVINGS ALLOCATION ACROSS GOALS
// ─────────────────────────────────────────────────────────────────────────────

export interface GoalAllocation {
  goalId: string;
  name: string;
  priority: GoalPriority;
  required: number;
  allocated: number;
  shortfall: number;
  suggestedDeadline: string | null; // when allocation < required
}

export interface SavingsPlan {
  monthlyCapacity: number;
  totalRequired: number;
  totalAllocated: number;
  surplus: number;     // capacity left after funding all goals
  shortfall: number;   // required − capacity (if positive)
  allocations: GoalAllocation[];
  summary: string;
}

export const buildSavingsPlan = (plans: GoalPlan[], monthlyCapacity: number, now = new Date()): SavingsPlan => {
  const active = plans
    .filter((p) => p.status !== "COMPLETED" && p.status !== "OVERDUE")
    .sort((a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity));

  let left = Math.max(round(monthlyCapacity), 0);
  const allocations: GoalAllocation[] = active.map((p) => {
    const required = p.requiredMonthly ?? 0;
    const allocated = Math.min(required, left);
    left -= allocated;
    let suggestedDeadline: string | null = null;
    if (allocated < required) {
      const m = monthsToReach(p.baseTarget, p.current, allocated, p.inflationRate);
      suggestedDeadline = m != null ? addMonths(now, m).toISOString() : null;
    }
    return { goalId: p.goalId, name: p.name, priority: p.priority, required, allocated, shortfall: required - allocated, suggestedDeadline };
  });

  // Goals without a deadline share whatever is left over
  const open = allocations.filter((a) => a.required === 0);
  if (open.length > 0 && left > 0) {
    const share = Math.floor(left / open.length);
    open.forEach((a) => { a.allocated = share; });
    left -= share * open.length;
  }

  const totalRequired = allocations.reduce((s, a) => s + a.required, 0);
  const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
  const shortfall = Math.max(totalRequired - Math.max(monthlyCapacity, 0), 0);

  let summary: string;
  if (allocations.length === 0) summary = "No active goals yet — add a goal to get a savings plan.";
  else if (shortfall === 0) summary = `Your goals need ${inr(totalRequired)}/month and you can save about ${inr(monthlyCapacity)}/month — every goal is fully funded with ${inr(Math.max(left, 0))} to spare.`;
  else {
    const squeezed = [...allocations].reverse().find((a) => a.shortfall > 0);
    summary = `Your goals need ${inr(totalRequired)}/month but you can save about ${inr(monthlyCapacity)}/month (short by ${inr(shortfall)}).` +
      (squeezed?.suggestedDeadline ? ` Consider moving "${squeezed.name}" to ${monthLabel(new Date(squeezed.suggestedDeadline))}, or raise savings by ${inr(shortfall)}/month.` : ` Raise savings by ${inr(shortfall)}/month or extend lower-priority deadlines.`);
  }

  return { monthlyCapacity: round(monthlyCapacity), totalRequired, totalAllocated, surplus: Math.max(left, 0), shortfall, allocations, summary };
};

// ─────────────────────────────────────────────────────────────────────────────
// YEARLY EXPENSE INFLATION PROJECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenseInput { category: string; amount: number; spentAt: Date | string; isRecurring: boolean }

export interface YearlyProjection {
  basis: "HISTORY" | "CURRENT_MONTH" | "NONE";
  monthsOfHistory: number;
  monthlyBaseline: number;
  annualBaseline: number;
  blendedRate: number;
  categories: { category: string; monthly: number; annual: number; rate: number }[];
  projections: { years: number; label: string; annual: number; monthly: number; increase: number; increasePct: number }[];
  purchasingPower: { years: number; valueOfOneLakh: number }[];
}

export const buildYearlyProjection = (
  expenses: ExpenseInput[],
  opts: { flatRate?: number | null; now?: Date; daysPassed?: number; totalDays?: number } = {}
): YearlyProjection => {
  const now = opts.now ?? new Date();
  const curKey = now.getFullYear() * 12 + now.getMonth();
  const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();

  // Group the last 6 *completed* months by category
  const fullMonths = new Map<number, Record<string, number>>();
  const currentMonth: { fixed: Record<string, number>; flexible: Record<string, number> } = { fixed: {}, flexible: {} };
  for (const e of expenses) {
    const d = new Date(e.spentAt);
    const k = monthKey(d);
    const amt = Number(e.amount);
    if (k === curKey) {
      const bucket = isFixedExpense(e) ? currentMonth.fixed : currentMonth.flexible;
      bucket[e.category] = (bucket[e.category] ?? 0) + amt;
    } else if (k < curKey && k >= curKey - 6) {
      const m = fullMonths.get(k) ?? {};
      m[e.category] = (m[e.category] ?? 0) + amt;
      fullMonths.set(k, m);
    }
  }

  const monthlyByCat: Record<string, number> = {};
  let basis: YearlyProjection["basis"] = "NONE";
  if (fullMonths.size > 0) {
    basis = "HISTORY";
    for (const m of fullMonths.values())
      for (const [cat, v] of Object.entries(m)) monthlyByCat[cat] = (monthlyByCat[cat] ?? 0) + v / fullMonths.size;
  } else {
    const totalDays = opts.totalDays ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = Math.max(opts.daysPassed ?? now.getDate(), 1);
    const cats = new Set([...Object.keys(currentMonth.fixed), ...Object.keys(currentMonth.flexible)]);
    if (cats.size > 0) basis = "CURRENT_MONTH";
    // Commitments counted once; day-to-day spending extrapolated to a full month
    for (const cat of cats)
      monthlyByCat[cat] = (currentMonth.fixed[cat] ?? 0) + ((currentMonth.flexible[cat] ?? 0) / daysPassed) * totalDays;
  }

  const rateFor = (cat: string) => opts.flatRate ?? EXPENSE_CATEGORY_INFLATION[cat] ?? DEFAULT_INFLATION;
  const categories = Object.entries(monthlyByCat)
    .map(([category, monthly]) => ({ category, monthly: round(monthly), annual: round(monthly * 12), rate: rateFor(category) }))
    .filter((c) => c.monthly > 0)
    .sort((a, b) => b.annual - a.annual);

  const annualBaseline = categories.reduce((s, c) => s + c.annual, 0);
  const blendedRate = annualBaseline > 0
    ? Math.round((categories.reduce((s, c) => s + c.annual * c.rate, 0) / annualBaseline) * 10) / 10
    : (opts.flatRate ?? DEFAULT_INFLATION);

  const horizons = [0, 1, 2, 3, 5, 10];
  const projections = horizons.map((y) => {
    const annual = round(categories.reduce((s, c) => s + inflate(c.annual, c.rate, y), 0));
    return {
      years: y,
      label: y === 0 ? "Today" : `+${y} yr${y > 1 ? "s" : ""}`,
      annual,
      monthly: round(annual / 12),
      increase: annual - annualBaseline,
      increasePct: annualBaseline > 0 ? Math.round(((annual - annualBaseline) / annualBaseline) * 1000) / 10 : 0,
    };
  });

  return {
    basis,
    monthsOfHistory: fullMonths.size,
    monthlyBaseline: round(annualBaseline / 12),
    annualBaseline,
    blendedRate,
    categories,
    projections,
    purchasingPower: [1, 5, 10].map((y) => ({ years: y, valueOfOneLakh: round(100000 / Math.pow(1 + blendedRate / 100, y)) })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SAFE-TO-SPEND APPRECIATION
// ─────────────────────────────────────────────────────────────────────────────

export type AppreciationLevel = "CHAMPION" | "GREAT" | "GOOD" | "OVER" | "NO_BUDGET";

export interface SpendingAppreciation {
  level: AppreciationLevel;
  eligible: boolean;                 // true → user is spending below safe-to-spend
  title: string;
  message: string;
  monthlySafeAllowance: number;      // budget − commitments − buffer
  dailyAllowance: number;            // planned safe-to-spend per day
  allowanceToDate: number;
  discretionarySpent: number;        // day-to-day spending this month
  savedSoFar: number;                // allowanceToDate − discretionarySpent
  savedPct: number;
  todaySpent: number;
  todayRemaining: number;            // dailyAllowance − todaySpent
  streakDays: number;                // consecutive days within allowance (incl. today)
  daysWithinLimit: number;
  daysPassed: number;
  projectedMonthEndSaving: number;   // allowance left at month end at current pace
  suggestion: string | null;
}

export const buildAppreciation = (input: {
  monthExpenses: { category: string; amount: number; spentAt: Date | string; isRecurring: boolean }[];
  totalBudget: number;
  dueThisMonthAmount: number;
  daysPassed: number;
  totalDays: number;
  topGoalName?: string | null;
  now?: Date;
}): SpendingAppreciation => {
  const now = input.now ?? new Date();
  const { totalBudget, daysPassed, totalDays } = input;
  const buffer = Math.max(totalBudget * 0.10, 500);

  let fixedSpent = 0;
  let discretionarySpent = 0;
  const byDay: Record<number, number> = {};
  for (const e of input.monthExpenses) {
    const amt = Number(e.amount);
    if (isFixedExpense(e)) { fixedSpent += amt; continue; }
    discretionarySpent += amt;
    const day = new Date(e.spentAt).getDate();
    byDay[day] = (byDay[day] ?? 0) + amt;
  }

  const monthlySafeAllowance = Math.max(totalBudget - fixedSpent - input.dueThisMonthAmount - buffer, 0);
  const dailyAllowance = totalDays > 0 ? monthlySafeAllowance / totalDays : 0;
  const allowanceToDate = dailyAllowance * daysPassed;
  const savedSoFar = allowanceToDate - discretionarySpent;
  const savedPct = allowanceToDate > 0 ? savedSoFar / allowanceToDate : 0;
  const today = now.getDate();
  const todaySpent = byDay[today] ?? 0;

  let streakDays = 0;
  for (let d = Math.min(today, daysPassed); d >= 1; d--) {
    if ((byDay[d] ?? 0) <= dailyAllowance) streakDays++;
    else break;
  }
  let daysWithinLimit = 0;
  for (let d = 1; d <= daysPassed; d++) if ((byDay[d] ?? 0) <= dailyAllowance) daysWithinLimit++;

  const pace = daysPassed > 0 ? discretionarySpent / daysPassed : 0;
  const projectedMonthEndSaving = round(monthlySafeAllowance - pace * totalDays);

  const base = {
    monthlySafeAllowance: round(monthlySafeAllowance), dailyAllowance: round(dailyAllowance),
    allowanceToDate: round(allowanceToDate), discretionarySpent: round(discretionarySpent),
    savedSoFar: round(savedSoFar), savedPct: Math.round(savedPct * 100),
    todaySpent: round(todaySpent), todayRemaining: round(dailyAllowance - todaySpent),
    streakDays, daysWithinLimit, daysPassed, projectedMonthEndSaving,
  };

  if (totalBudget <= 0 || monthlySafeAllowance <= 0) {
    return {
      ...base, level: "NO_BUDGET", eligible: false,
      title: totalBudget <= 0 ? "Set a budget to unlock safe-to-spend rewards" : "Commitments use up this month's budget",
      message: totalBudget <= 0
        ? "Create a monthly budget and WealthMap will track your safe-to-spend allowance and celebrate every rupee you save."
        : "Your fixed commitments and buffer use the whole budget, so there is no discretionary allowance left this month.",
      suggestion: null,
    };
  }

  if (savedSoFar <= 0) {
    const remainingDays = Math.max(totalDays - daysPassed, 1);
    const catchUpDaily = Math.max(round((monthlySafeAllowance - discretionarySpent) / remainingDays), 0);
    return {
      ...base, level: "OVER", eligible: false,
      title: "Spending is ahead of your safe-to-spend pace",
      message: `You've spent ${inr(discretionarySpent)} on day-to-day items — ${inr(-savedSoFar)} more than your safe allowance so far. Keep daily spending under ${inr(catchUpDaily)} for the remaining ${remainingDays} days to finish the month on budget.`,
      suggestion: `Cap daily spending at ${inr(catchUpDaily)} until month end.`,
    };
  }

  const level: AppreciationLevel = savedPct >= 0.4 ? "CHAMPION" : savedPct >= 0.2 ? "GREAT" : "GOOD";
  const title = level === "CHAMPION" ? "Savings Champion! 🏆" : level === "GREAT" ? "Outstanding financial discipline! 🎉" : "Nice work — you're under your safe-to-spend! 👏";
  const streakText = streakDays >= 2 ? ` You're on a ${streakDays}-day streak within your daily limit.` : "";
  return {
    ...base, level, eligible: true, title,
    message: `You've spent ${inr(savedSoFar)} less than your safe-to-spend allowance this month (${Math.round(savedPct * 100)}% under).${streakText}` +
      (projectedMonthEndSaving > 0 ? ` Keep this pace and you'll free up about ${inr(projectedMonthEndSaving)} by month end.` : ""),
    suggestion: input.topGoalName
      ? `Move the ${inr(savedSoFar)} you saved into "${input.topGoalName}" to reach it sooner.`
      : `Move the ${inr(savedSoFar)} you saved into a savings goal.`,
  };
};
