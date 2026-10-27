/**
 * AI Recommendation Engine
 * ─────────────────────────
 * The AI never does financial calculations.
 * It receives structured engine output and converts it to natural language.
 *
 * Supports OpenAI (default). To swap to Gemini, change buildClient().
 */

import OpenAI from "openai";
import { FinancialState } from "../engines/financialState.service";
import { ForecastResult } from "../engines/forecasting.service";
import { RiskResult } from "../engines/risk.service";
import { HealthScoreBreakdown } from "../engines/healthScore.service";

const buildClient = () =>
  new OpenAI({ apiKey: process.env.LLM_API_KEY });

// ── Build a compact financial context string for the LLM ─────────────────────
const buildContext = (
  state:      FinancialState,
  forecast:   ForecastResult,
  risk:       RiskResult,
  health:     HealthScoreBreakdown,
  userPrompt?: string
): string => `
FINANCIAL SNAPSHOT (${state.month}/${state.year})
- Monthly income: ₹${state.declaredMonthlyIncome.toLocaleString("en-IN")}
- Budget: ₹${state.totalBudget.toLocaleString("en-IN")} | Spent: ₹${state.totalSpent.toLocaleString("en-IN")} (${state.overallUtilization}%)
- Cash balance: ₹${state.cashBalance.toLocaleString("en-IN")}
- Upcoming obligations: ₹${state.totalUpcomingAmount.toLocaleString("en-IN")}
- Safe to spend today: ₹${state.safeDailySpending.toLocaleString("en-IN")}/day
- Actual daily spending: ₹${state.avgDailySpending.toLocaleString("en-IN")}/day (${state.avgDailySpending <= state.safeDailySpending ? "DISCIPLINED: SPENDING UNDER SAFE LIMIT" : "EXCEEDED SAFE LIMIT"})
- Safe spendable discretionary surplus: ₹${state.safeSpendableAmount.toLocaleString("en-IN")}

ACTIVE GOALS & SAVINGS TARGETS
${state.activeGoals.length > 0
  ? state.activeGoals.map((g) => `- ${g.name}: ${g.progress}% achieved (Remaining: ₹${g.remaining.toLocaleString("en-IN")})`).join("\n")
  : "- None"}

FORECAST
- Projected month-end expense: ₹${forecast.projectedMonthlyExpense.toLocaleString("en-IN")}
- Will exceed budget: ${forecast.willExceedBudget ? `YES by ₹${forecast.expectedExcess.toLocaleString("en-IN")}` : "No"}
- Spending velocity change: ${forecast.velocityChangePercent > 0 ? "+" : ""}${forecast.velocityChangePercent}% vs last month

RISK
- Overall risk score: ${risk.riskScore}/100 (${risk.riskLevel})
- Components: Budget ${risk.components.budgetRisk}, CashFlow ${risk.components.cashFlowRisk}, Obligations ${risk.components.obligationRisk}, Velocity ${risk.components.velocityRisk}, Goals ${risk.components.goalRisk}
- Active alerts: ${risk.alerts.join(" | ")}

HEALTH SCORE
- Total: ${health.total}/100 (${health.grade})
- Budget adherence: ${health.components.budgetAdherence.score}/100
- Cash buffer: ${health.components.cashBuffer.score}/100
- Obligation coverage: ${health.components.obligationCoverage.score}/100

TOP OVERSPENDING CATEGORIES
${forecast.categoryForecasts
  .filter((c) => c.willExceed)
  .map((c) => `- ${c.category}: projected ₹${c.projected.toLocaleString("en-IN")} vs budget ₹${c.budget.toLocaleString("en-IN")} (excess ₹${c.expectedExcess.toLocaleString("en-IN")})`)
  .join("\n") || "- None"}

USER SPECIFIC QUERY: ${userPrompt || "General financial and goal advice"}
`.trim();

// ── Main service function ─────────────────────────────────────────────────────
export const getRecommendationsService = async (
  state:       FinancialState,
  forecast:    ForecastResult,
  risk:        RiskResult,
  health:      HealthScoreBreakdown,
  userPrompt?: string
): Promise<{ recommendations: string[]; rawResponse: string }> => {
  const apiKey = process.env.LLM_API_KEY?.trim();

  // If no API key, return rule-based fallback so the app still works
  if (!apiKey || /^(your|replace-with|<)/i.test(apiKey)) {
    return buildFallbackRecommendations(state, forecast, risk, userPrompt);
  }

  const client  = buildClient();
  const context = buildContext(state, forecast, risk, health, userPrompt);

  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a personal finance assistant. The user's financial data has already been analysed by calculation engines. " +
          "Your job is to give concise, actionable recommendations. " +
          "When the user asks about goals, state specific monthly rupee amounts they should save to hit their targets taking inflation into account. " +
          "Give appreciation if their spending is below safe-to-spend limits. " +
          "Keep each recommendation to 1–2 sentences. Be specific, motivating, and direct.",
      },
      {
        role: "user",
        content: `Here is my current financial data:\n\n${context}\n\nGive me 3 specific recommendations.`,
      },
    ],
    temperature: 0.4,
    max_tokens:  500,
  });

  const rawResponse = response.choices[0]?.message?.content ?? "";

  // Parse numbered recommendations from LLM response
  const recommendations = rawResponse
    .split(/\n+/)
    .filter((line) => /^\d[\.\)]/.test(line.trim()))
    .map((line) => line.replace(/^\d[\.\)]\s*/, "").trim())
    .filter(Boolean);

  return {
    recommendations: recommendations.length > 0 ? recommendations : [rawResponse],
    rawResponse,
  };
};

// ── Rule-based fallback (no LLM API key required) ────────────────────────────
const buildFallbackRecommendations = (
  state:       FinancialState,
  forecast:    ForecastResult,
  risk:        RiskResult,
  userPrompt?: string
): { recommendations: string[]; rawResponse: string } => {
  const recs: string[] = [];
  const query = (userPrompt || "").toLowerCase();

  // 1. Goal advice if query mentions goals or user has active goals
  if (state.activeGoals.length > 0 && (query.includes("goal") || query.includes("save") || recs.length === 0)) {
    const primaryGoal = state.activeGoals[0];
    const recommendedSaving = Math.round(state.safeSpendableAmount * 0.4);
    recs.push(
      `Goal Savings Plan: Allocate ₹${recommendedSaving.toLocaleString("en-IN")}/month of your safe surplus to your "${primaryGoal.name}" goal to stay well ahead of your target deadline.`
    );
  }

  // 2. Safe-to-spend appreciation or guidance
  if (state.safeDailySpending > 0 && state.avgDailySpending <= state.safeDailySpending) {
    const dailyDiff = state.safeDailySpending - state.avgDailySpending;
    recs.push(
      `🎉 Great financial discipline! You are spending ₹${dailyDiff.toLocaleString("en-IN")}/day below your safe-to-spend limit. This frees up extra monthly savings to compound your wealth.`
    );
  } else if (state.safeDailySpending > 0) {
    recs.push(
      `To stay on track this month, try to keep daily discretionary spending at or below ₹${state.safeDailySpending.toLocaleString("en-IN")}.`
    );
  }

  // 3. Inflation guidance for long-term targets
  recs.push(
    "Inflation Protection: At a projected 6% annual inflation rate, factor in an extra 10–18% target buffer for long-term goals beyond 2 years, parking funds in index mutual funds."
  );

  // 4. Overspending check
  if (forecast.willExceedBudget) {
    const top = forecast.categoryForecasts
      .filter((c) => c.willExceed)
      .sort((a, b) => b.expectedExcess - a.expectedExcess)[0];

    recs.unshift(
      top
        ? `Your ${top.category} spending is projected to exceed its budget by ₹${top.expectedExcess.toLocaleString("en-IN")}. Try to reduce ${top.category} expenses for the rest of the month.`
        : `Your total spending is projected to exceed the budget by ₹${forecast.expectedExcess.toLocaleString("en-IN")}. Review your discretionary spending.`
    );
  }

  if (state.cashBalance < state.totalUpcomingAmount * 1.2) {
    recs.push(
      `Your upcoming obligations (₹${state.totalUpcomingAmount.toLocaleString("en-IN")}) are close to your current cash balance. Avoid large non-essential purchases until they are paid.`
    );
  }

  return { recommendations: recs.slice(0, 3), rawResponse: recs.join("\n") };
};
