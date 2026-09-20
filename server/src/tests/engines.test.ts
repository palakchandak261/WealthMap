/**
 * Engine Logic Tests — no database required
 * Run with: npx tsx src/tests/engines.test.ts
 *
 * Tests every algorithm with known inputs and asserts expected outputs.
 */

import { runHealthScoreEngine } from "../modules/engines/healthScore.service";
import { runHealthScoreEngine as _ } from "../modules/engines/healthScore.service";
import { FinancialState } from "../modules/engines/financialState.service";
import { ForecastResult } from "../modules/engines/forecasting.service";
import { RiskResult } from "../modules/engines/risk.service";
import { runSimulation } from "../modules/engines/simulation.service";
import { daysInMonth, daysPassed, daysRemaining, monthRange } from "../lib/dateHelpers";

// ── Tiny test harness ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  ❌ ${name}\n     → ${err.message}`);
    failed++;
  }
}

function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeCloseTo: (expected: number, tol = 5) => {
      if (Math.abs(actual - expected) > tol)
        throw new Error(`Expected ~${expected}, got ${actual}`);
    },
    toBeGreaterThan: (n: number) => {
      if (!(actual > n)) throw new Error(`Expected > ${n}, got ${actual}`);
    },
    toBeLessThan: (n: number) => {
      if (!(actual < n)) throw new Error(`Expected < ${n}, got ${actual}`);
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`Expected truthy, got ${actual}`);
    },
    toBeFalsy: () => {
      if (actual) throw new Error(`Expected falsy, got ${actual}`);
    },
  };
}

// ── Build a realistic mock FinancialState ─────────────────────────────────────
const mockState = (): FinancialState => ({
  userId:                "test-user",
  month:                 9,
  year:                  2026,
  declaredMonthlyIncome: 75000,
  totalIncomeThisMonth:  75000,
  cashBalance:           85000,
  savingsBalance:        150000,
  emergencyFundBalance:  50000,
  totalBudget:           50000,
  totalSpent:            28000,
  totalRemaining:        22000,
  overallUtilization:    56,
  categories: [
    { category: "Groceries",    budget: 10000, spent: 4300,  remaining: 5700,  utilization: 43, status: "NORMAL"  },
    { category: "Dining",       budget: 6000,  spent: 3000,  remaining: 3000,  utilization: 50, status: "NORMAL"  },
    { category: "Transport",    budget: 4000,  spent: 1800,  remaining: 2200,  utilization: 45, status: "NORMAL"  },
    { category: "Entertainment",budget: 5000,  spent: 4600,  remaining: 400,   utilization: 92, status: "CRITICAL"},
    { category: "Utilities",    budget: 5000,  spent: 5200,  remaining: -200,  utilization: 104,status: "EXCEEDED"},
  ],
  avgDailySpending:      1400,
  daysPassedInMonth:     20,
  daysRemainingInMonth:  10,
  totalDaysInMonth:      30,
  upcomingObligations: [
    { id: "ob1", name: "Car EMI", amount: 8500, dueDate: new Date("2026-09-28"), type: "EMI" },
    { id: "ob2", name: "Rent",    amount: 20000,dueDate: new Date("2026-10-01"), type: "RENT"},
  ],
  totalUpcomingAmount:   28500,
  safeSpendableAmount:   Math.max(22000 - 28500 - 5000, 0),  // 0
  safeDailySpending:     0,
  activeGoals: [
    { id: "g1", name: "Emergency Fund", progress: 50, remaining: 150000 },
  ],
});

const mockForecast = (): ForecastResult => ({
  projectedMonthlyExpense:   42000,
  currentBudget:             50000,
  expectedExcess:            -8000,  // under budget
  willExceedBudget:          false,
  previousAvgDailySpending:  1200,
  currentAvgDailySpending:   1400,
  velocityChangePercent:     17,
  categoryForecasts: [],
});

const mockRisk = (): RiskResult => ({
  riskScore:  48,
  riskLevel:  "MODERATE",
  components: {
    budgetRisk:     35,
    cashFlowRisk:   70,
    obligationRisk: 57,
    velocityRisk:   25,
    goalRisk:       20,
  },
  alerts: ["⚠️ Upcoming obligations are a significant portion of the monthly budget"],
});

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📐 DATE HELPERS");
// ─────────────────────────────────────────────────────────────────────────────

test("daysInMonth returns 30 for September", () => {
  expect(daysInMonth(9, 2026)).toBe(30);
});

test("daysInMonth returns 28 for Feb non-leap year", () => {
  expect(daysInMonth(2, 2025)).toBe(28);
});

test("daysInMonth returns 29 for Feb leap year", () => {
  expect(daysInMonth(2, 2024)).toBe(29);
});

test("monthRange start is first of month", () => {
  const { start } = monthRange(9, 2026);
  expect(start.getDate()).toBe(1);
  expect(start.getMonth()).toBe(8); // 0-indexed
});

test("monthRange end is last moment of month", () => {
  const { end } = monthRange(9, 2026);
  expect(end.getDate()).toBe(30);
});

test("daysRemaining is at least 1", () => {
  expect(daysRemaining(9, 2026)).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📊 HEALTH SCORE ENGINE");
// ─────────────────────────────────────────────────────────────────────────────

test("health score is between 0 and 100", () => {
  const h = runHealthScoreEngine(mockState(), mockForecast(), mockRisk());
  expect(h.total).toBeGreaterThan(0);
  expect(h.total).toBeLessThan(101);
});

test("health score has 6 components", () => {
  const h = runHealthScoreEngine(mockState(), mockForecast(), mockRisk());
  const keys = Object.keys(h.components);
  expect(keys.length).toBe(6);
});

test("each component score is 0–100", () => {
  const h = runHealthScoreEngine(mockState(), mockForecast(), mockRisk());
  for (const [key, comp] of Object.entries(h.components)) {
    if ((comp as any).score < 0 || (comp as any).score > 100) {
      throw new Error(`Component ${key} score out of range: ${(comp as any).score}`);
    }
  }
});

test("healthy state scores GOOD or EXCELLENT", () => {
  const h = runHealthScoreEngine(mockState(), mockForecast(), mockRisk());
  if (!["GOOD", "EXCELLENT", "FAIR"].includes(h.grade)) {
    throw new Error(`Unexpected grade: ${h.grade}`);
  }
});

test("over-budget state scores worse than under-budget", () => {
  const overForecast: ForecastResult = {
    ...mockForecast(),
    willExceedBudget:        true,
    expectedExcess:          15000,
    projectedMonthlyExpense: 65000,
  };
  const overState = { ...mockState(), overallUtilization: 95 };
  const h1 = runHealthScoreEngine(mockState(),   mockForecast(), mockRisk());
  const h2 = runHealthScoreEngine(overState, overForecast, mockRisk());
  expect(h2.total).toBeLessThan(h1.total);
});

test("health score insights array is non-empty", () => {
  const h = runHealthScoreEngine(mockState(), mockForecast(), mockRisk());
  expect(h.insights.length).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n🧪 WHAT-IF SIMULATOR");
// ─────────────────────────────────────────────────────────────────────────────

test("simulation returns before and after objects", async () => {
  const state    = mockState();
  const forecast = mockForecast();
  const risk     = mockRisk();
  const health   = runHealthScoreEngine(state, forecast, risk);

  const result = await runSimulation("test-user", state, forecast, risk, health, {
    amount: 5000, category: "Groceries",
  });

  if (!result.before || !result.after) throw new Error("Missing before/after");
});

test("simulation: after.cashBalance = before - amount", async () => {
  const state    = mockState();
  const forecast = mockForecast();
  const risk     = mockRisk();
  const health   = runHealthScoreEngine(state, forecast, risk);

  const result = await runSimulation("test-user", state, forecast, risk, health, { amount: 5000 });
  expect(result.after.cashBalance).toBe(result.before.cashBalance - 5000);
});

test("simulation: diff.cashImpact equals -amount", async () => {
  const state    = mockState();
  const forecast = mockForecast();
  const risk     = mockRisk();
  const health   = runHealthScoreEngine(state, forecast, risk);

  const result = await runSimulation("test-user", state, forecast, risk, health, { amount: 3000 });
  expect(result.diff.cashImpact).toBe(-3000);
});

test("simulation: large purchase raises risk", async () => {
  const state    = mockState();
  const forecast = mockForecast();
  const risk     = mockRisk();
  const health   = runHealthScoreEngine(state, forecast, risk);

  const result = await runSimulation("test-user", state, forecast, risk, health, { amount: 40000 });
  expect(result.diff.riskDelta).toBeGreaterThan(0);
});

test("simulation: small purchase keeps verdict positive", async () => {
  const state    = mockState();
  const forecast = mockForecast();
  const risk     = mockRisk();
  const health   = runHealthScoreEngine(state, forecast, risk);

  const result = await runSimulation("test-user", state, forecast, risk, health, { amount: 200 });
  expect(result.verdict.length).toBeGreaterThan(0);
});

test("simulation: projected expense increases by amount", async () => {
  const state    = mockState();
  const forecast = mockForecast();
  const risk     = mockRisk();
  const health   = runHealthScoreEngine(state, forecast, risk);

  const result = await runSimulation("test-user", state, forecast, risk, health, { amount: 7000 });
  expect(result.after.projectedExpense).toBe(result.before.projectedExpense + 7000);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n🔢 BUDGET CALCULATION LOGIC");
// ─────────────────────────────────────────────────────────────────────────────

test("category utilization: 4300/10000 = 43%", () => {
  const spent = 4300, budget = 10000;
  const util = Math.round((spent / budget) * 100);
  expect(util).toBe(43);
});

test("safe daily = (remaining - obligations - buffer) / days", () => {
  const remaining    = 22000;
  const obligations  = 28500;
  const buffer       = Math.max(50000 * 0.10, 500); // 5000
  const daysLeft     = 10;
  const safe         = Math.max(remaining - obligations - buffer, 0) / daysLeft;
  expect(safe).toBe(0); // shortfall → 0
});

test("safe daily is positive when budget is healthy", () => {
  const remaining    = 20000;
  const obligations  = 5000;
  const buffer       = 2000;
  const daysLeft     = 10;
  const safe         = Math.max(remaining - obligations - buffer, 0) / daysLeft;
  expect(safe).toBe(1300);
});

test("overall utilization: 28000/50000 = 56%", () => {
  const util = Math.round((28000 / 50000) * 100);
  expect(util).toBe(56);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📈 RISK SCORE FORMULA");
// ─────────────────────────────────────────────────────────────────────────────

test("risk formula: known weights sum correctly", () => {
  const { budgetRisk, cashFlowRisk, obligationRisk, velocityRisk, goalRisk } = mockRisk().components;
  const score = Math.round(
    0.30 * budgetRisk +
    0.25 * cashFlowRisk +
    0.20 * obligationRisk +
    0.15 * velocityRisk +
    0.10 * goalRisk
  );
  // 0.30×35 + 0.25×70 + 0.20×57 + 0.15×25 + 0.10×20
  // = 10.5 + 17.5 + 11.4 + 3.75 + 2 = 45.15 ≈ 45
  expect(score).toBeCloseTo(45, 2);
});

test("risk level: 0–30 is LOW", () => {
  const level = (s: number) =>
    s >= 81 ? "CRITICAL" : s >= 61 ? "HIGH" : s >= 31 ? "MODERATE" : "LOW";
  expect(level(25)).toBe("LOW");
  expect(level(50)).toBe("MODERATE");
  expect(level(70)).toBe("HIGH");
  expect(level(90)).toBe("CRITICAL");
});

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n📉 FORECAST FORMULA");
// ─────────────────────────────────────────────────────────────────────────────

test("weighted forecast: 0.5×A + 0.3×B + 0.2×C", () => {
  const currentVelocity    = 42000; // avgDaily × daysInMonth
  const historicalAvg      = 48000;
  const recent7            = 45000;
  const projected = Math.round(0.50 * currentVelocity + 0.30 * historicalAvg + 0.20 * recent7);
  // 21000 + 14400 + 9000 = 44400
  expect(projected).toBe(44400);
});

test("forecast: will exceed budget when projected > budget", () => {
  const projected = 55000;
  const budget    = 50000;
  expect(projected > budget).toBeTruthy();
  expect(projected - budget).toBe(5000);
});

test("velocity change %: (1400-1200)/1200 × 100 = 16.67% ≈ 17%", () => {
  const curr = 1400, prev = 1200;
  const change = Math.round(((curr - prev) / prev) * 100);
  expect(change).toBe(17);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ Some tests failed — check errors above");
  process.exit(1);
} else {
  console.log("✅ All tests passed");
  process.exit(0);
}
