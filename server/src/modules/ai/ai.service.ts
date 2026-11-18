/**
 * AI Recommendation Engine
 * ─────────────────────────
 * The AI never does financial calculations. The engines compute every number
 * (goal plans, savings capacity, inflation, appreciation) and the LLM turns
 * them into friendly, actionable advice.
 *
 * Providers (set LLM_PROVIDER in server/.env):
 *   gemini  → Google Gemini REST API      (LLM_MODEL default: gemini-2.5-flash,
 *                                          falls back to gemini-flash-latest / flash-lite)
 *   openai  → OpenAI Chat Completions     (LLM_MODEL default: gpt-4o-mini)
 *   none    → rule-based advice only
 * If the key is missing or the provider fails, a rule-based advisor answers
 * so the feature always works (response.source tells the UI which one ran).
 */

import OpenAI from "openai";
import { FinancialState } from "../engines/financialState.service";
import { ForecastResult } from "../engines/forecasting.service";
import { RiskResult } from "../engines/risk.service";
import { HealthScoreBreakdown } from "../engines/healthScore.service";
import { PlanningSnapshot } from "../engines/planning.service";
import { inr, monthLabel } from "../../lib/finance";

export type InsightCategory = "GOAL" | "SAVING" | "SPENDING" | "INFLATION" | "RISK" | "APPRECIATION";
const CATEGORIES: InsightCategory[] = ["GOAL", "SAVING", "SPENDING", "INFLATION", "RISK", "APPRECIATION"];

export interface AIInsight {
  title:    string;
  detail:   string;
  category: InsightCategory;
  amount?:  number | null;
}

export interface AIAdvice {
  summary:         string;
  insights:        AIInsight[];
  recommendations: string[];          // flat strings (backward compatible)
  source:          "gemini" | "openai" | "rules";
  model:           string | null;
  fallbackReason?: string;
}

export interface AdviceInput {
  state:       FinancialState;
  forecast:    ForecastResult;
  risk:        RiskResult;
  health:      HealthScoreBreakdown;
  planning:    PlanningSnapshot;
  userPrompt?: string;
}

const AI_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// Context for the LLM — every figure is pre-computed by the engines
// ─────────────────────────────────────────────────────────────────────────────
const buildContext = ({ state, forecast, risk, health, planning, userPrompt }: AdviceInput): string => {
  const ap = planning.appreciation;
  const y  = planning.yearlyProjection;
  const nextYear = y.projections.find((p) => p.years === 1);
  const fiveYear = y.projections.find((p) => p.years === 5);
  const goals = planning.goalPlans.filter((g) => g.status !== "COMPLETED");

  return `
MONTH: ${state.month}/${state.year} (day ${state.daysPassedInMonth} of ${state.totalDaysInMonth})

INCOME & CAPACITY
- Monthly income: ${inr(planning.monthlyIncome)}
- Expected spend this month: ${inr(planning.expectedMonthlySpend)} (budget ${inr(state.totalBudget)}, spent so far ${inr(state.totalSpent)})
- Obligations still due this month: ${inr(planning.dueThisMonth)}
- Monthly savings capacity for goals: ${inr(planning.monthlySavingsCapacity)}
- Cash ${inr(state.cashBalance)} | Savings ${inr(state.savingsBalance)} | Emergency fund ${inr(state.emergencyFundBalance)}

SAFE-TO-SPEND
- Safe to spend now: ${inr(state.safeDailySpending)}/day for ${state.daysRemainingInMonth} days (${inr(state.safeSpendableAmount)} total)
${ap ? `- Planned daily allowance: ${inr(ap.dailyAllowance)}; day-to-day spending so far ${inr(ap.discretionarySpent)} vs allowance ${inr(ap.allowanceToDate)}
- Appreciation status: ${ap.level}${ap.eligible ? ` — UNDER safe-to-spend by ${inr(ap.savedSoFar)} (${ap.savedPct}%), streak ${ap.streakDays} days` : ""}` : "- No budget set"}

GOALS (engine-computed, inflation-adjusted; "required" = save this much per month)
${goals.length ? goals.map((g) =>
  `- ${g.name} [${g.priority} priority, ${g.category}]: today's cost ${inr(g.baseTarget)}, cost at deadline ${inr(g.futureTarget)} (${g.inflationRate}% inflation), saved ${inr(g.current)}, ` +
  `deadline ${g.deadline ? monthLabel(g.deadline) : "none"}, required ${g.requiredMonthly != null ? inr(g.requiredMonthly) + "/month" : "n/a"}, ` +
  `current pace ${inr(g.monthlyPace)}/month, status ${g.status}${g.monthsBehind ? ` (${g.monthsBehind} months behind)` : ""}`
).join("\n") : "- No active goals"}
- Allocation: ${planning.savingsPlan.summary}
${planning.savingsPlan.allocations.map((a) => `  • ${a.name}: allocate ${inr(a.allocated)}/month of ${inr(a.required)} required${a.suggestedDeadline ? ` → realistic date ${monthLabel(a.suggestedDeadline)}` : ""}`).join("\n")}

INFLATION ON YEARLY EXPENSES
- Current yearly living cost: ${inr(y.annualBaseline)} (blended inflation ${y.blendedRate}%)
- Next year: ${nextYear ? inr(nextYear.annual) : "n/a"}; in 5 years: ${fiveYear ? inr(fiveYear.annual) : "n/a"}
- Biggest categories: ${y.categories.slice(0, 4).map((c) => `${c.category} ${inr(c.annual)}/yr @${c.rate}%`).join(", ") || "n/a"}

FORECAST & RISK
- Projected month-end spend: ${inr(forecast.projectedMonthlyExpense)} — ${forecast.willExceedBudget ? `OVER budget by ${inr(forecast.expectedExcess)}` : "within budget"}
- Velocity vs last month: ${forecast.velocityChangePercent > 0 ? "+" : ""}${forecast.velocityChangePercent}%
- Overspending categories: ${forecast.categoryForecasts.filter((c) => c.willExceed).map((c) => `${c.category} (+${inr(c.expectedExcess)})`).join(", ") || "none"}
- Risk ${risk.riskScore}/100 (${risk.riskLevel}); health ${health.total}/100 (${health.grade})
- Alerts: ${risk.alerts.join(" | ")}

USER QUESTION: ${userPrompt?.trim() || "Give me my personalised savings plan and financial advice."}
`.trim();
};

const SYSTEM_PROMPT = [
  "You are WealthMap's personal finance advisor for an Indian user. All amounts are in Indian Rupees (₹, Indian digit grouping).",
  "The calculation engines have ALREADY computed every number. Never invent, change or recalculate figures — quote the numbers from the context.",
  "Always include:",
  "1) For the top goals, a concrete 'Save ₹X/month for <goal>' instruction using the engine's inflation-adjusted required amount (mention when the allocation forces a later date).",
  "2) Appreciation (category APPRECIATION) if the user is under their safe-to-spend allowance — praise them and say where to redirect the saved money.",
  "3) One INFLATION insight about yearly expenses or goal costs.",
  "4) Other specific actions answering the user's question.",
  "Respond with JSON only, no markdown: {\"summary\": string, \"insights\": [{\"title\": string, \"detail\": string, \"category\": \"GOAL\"|\"SAVING\"|\"SPENDING\"|\"INFLATION\"|\"RISK\"|\"APPRECIATION\", \"amount\": number|null}]}.",
  "Give 4 to 6 insights. Titles ≤ 8 words. Each detail ≤ 2 sentences. Be specific, warm and direct.",
].join("\n");

// ─────────────────────────────────────────────────────────────────────────────
// Provider calls
// ─────────────────────────────────────────────────────────────────────────────
class ProviderError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

const resolveProvider = (): { provider: "gemini" | "openai" | "none"; key: string } => {
  // Tolerate stray quotes/spaces from hand-edited .env files (e.g. LLM_PROVIDER="gemini)
  const clean = (v?: string) => (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  const key = clean(process.env.LLM_API_KEY);
  const configured = clean(process.env.LLM_PROVIDER).toLowerCase();
  if (!key || /^(your|replace-with|<)/i.test(key) || configured === "none") return { provider: "none", key: "" };
  if (configured === "gemini" || configured === "google") return { provider: "gemini", key };
  if (configured === "openai") return { provider: "openai", key };
  // Infer from key format when LLM_PROVIDER is not set
  return { provider: key.startsWith("sk-") ? "openai" : "gemini", key };
};

const callGemini = async (key: string, context: string): Promise<{ text: string; model: string }> => {
  // Stable, fast model first; "-latest" aliases as fallbacks (they can be overloaded)
  const models = [process.env.LLM_MODEL?.trim().replace(/^["']+|["']+$/g, ""), "gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"]
    .filter((m, i, arr): m is string => !!m && !m.startsWith("gpt") && arr.indexOf(m) === i);

  // Overall budget so the user never waits longer than the client timeout (60 s)
  const deadline = Date.now() + 45_000;
  const perAttemptMs = 20_000;
  let lastError: ProviderError | null = null;

  for (const model of models) {
    // A busy model (5xx) gets one quick retry before moving on to the next model
    for (let attempt = 0; attempt < 2; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 3000) throw lastError ?? new ProviderError("Gemini timed out", 504);

      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          signal:  AbortSignal.timeout(Math.min(perAttemptMs, remainingMs)),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: `My financial data:\n\n${context}` }] }],
            generationConfig: {
              temperature: 0.4, maxOutputTokens: 4096, responseMimeType: "application/json",
              // The numbers are pre-computed, so 2.5 models don't need slow "thinking"
              ...(model.startsWith("gemini-2.5") && { thinkingConfig: { thinkingBudget: 0 } }),
            },
          }),
        });
      } catch (err) {
        // Timeout / network error on this model → move on to the next model
        const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
        lastError = new ProviderError(`Gemini ${model} → ${timedOut ? "timed out" : (err as Error)?.message ?? err}`, timedOut ? 504 : 503);
        break;
      }

      if (res.ok) {
        const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (!text.trim()) throw new ProviderError("Gemini returned an empty response");
        return { text, model };
      }

      const body = await res.text().catch(() => "");
      lastError = new ProviderError(`Gemini ${model} → HTTP ${res.status}: ${body.slice(0, 200)}`, res.status);
      if (res.status >= 500 && attempt === 0) { await new Promise((r) => setTimeout(r, 800)); continue; }
      break;
    }

    // Bad key / bad request won't be fixed by another model → stop. Missing model,
    // per-model quota (429) or overloaded model (5xx) → try the next model.
    const status = lastError?.status ?? 0;
    if (!(status === 404 || status === 429 || status >= 500)) break;
  }
  throw lastError ?? new ProviderError("No Gemini model available");
};

const callOpenAI = async (key: string, context: string): Promise<{ text: string; model: string }> => {
  const model  = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const client = new OpenAI({ apiKey: key, timeout: AI_TIMEOUT_MS, maxRetries: 1 });
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: `My financial data:\n\n${context}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens:  1200,
    });
    return { text: response.choices[0]?.message?.content ?? "", model };
  } catch (err: any) {
    throw new ProviderError(`OpenAI → ${err?.status ?? ""} ${err?.message ?? err}`, err?.status);
  }
};

/** Parse the model's JSON (tolerates ```json fences and stray text). */
export const parseAdviceJson = (text: string): { summary: string; insights: AIInsight[] } | null => {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(cleaned.slice(start, end + 1));
    const insights: AIInsight[] = (Array.isArray(raw.insights) ? raw.insights : [])
      .filter((i: any) => i && typeof i.title === "string" && typeof i.detail === "string")
      .map((i: any) => ({
        title:    i.title.trim().slice(0, 120),
        detail:   i.detail.trim().slice(0, 600),
        category: CATEGORIES.includes(String(i.category).toUpperCase() as InsightCategory)
          ? (String(i.category).toUpperCase() as InsightCategory) : "SAVING",
        amount:   typeof i.amount === "number" && Number.isFinite(i.amount) ? Math.round(i.amount) : null,
      }))
      .slice(0, 8);
    if (insights.length === 0) return null;
    return { summary: typeof raw.summary === "string" ? raw.summary.trim() : "", insights };
  } catch {
    return null;
  }
};

const friendlyReason = (err: unknown): string => {
  const status = err instanceof ProviderError ? err.status : undefined;
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return "The AI provider timed out";
  if (status === 401 || status === 403) return "The AI provider rejected the API key";
  if (status === 400) return "The AI provider rejected the request (check LLM_API_KEY / LLM_MODEL)";
  if (status === 404) return "The configured AI model is not available";
  if (status === 429) return "AI quota exceeded — try again later";
  if (status === 504) return "The AI provider timed out";
  if (status && status >= 500) return "The AI model is busy right now (high demand) — try again in a minute";
  if (err instanceof ProviderError && /empty response/i.test(err.message)) return "The AI returned an empty answer";
  return "The AI provider is unreachable";
};

// ─────────────────────────────────────────────────────────────────────────────
// Main entry
// ─────────────────────────────────────────────────────────────────────────────
export const getRecommendationsService = async (input: AdviceInput): Promise<AIAdvice> => {
  const { provider, key } = resolveProvider();
  const rules = buildRuleBasedAdvice(input);

  if (provider === "none") {
    return { ...rules, source: "rules", model: null, fallbackReason: "No AI API key configured (LLM_API_KEY)" };
  }

  try {
    const context = buildContext(input);
    const { text, model } = provider === "gemini" ? await callGemini(key, context) : await callOpenAI(key, context);
    const parsed = parseAdviceJson(text);
    if (!parsed) throw new ProviderError("Could not parse the AI response");
    return {
      summary:         parsed.summary || rules.summary,
      insights:        parsed.insights,
      recommendations: parsed.insights.map((i) => `${i.title} — ${i.detail}`),
      source:          provider,
      model,
    };
  } catch (err) {
    console.warn(`[AI] ${provider} failed, using rule-based advice:`, err instanceof Error ? err.message : err);
    return { ...rules, source: "rules", model: null, fallbackReason: friendlyReason(err) };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Rule-based advisor (no API key needed) — also mirrored for demo mode
// ─────────────────────────────────────────────────────────────────────────────
export const buildRuleBasedAdvice = (
  { state, forecast, planning, userPrompt }: AdviceInput
): { summary: string; insights: AIInsight[]; recommendations: string[] } => {
  const q = (userPrompt ?? "").toLowerCase();
  const insights: AIInsight[] = [];
  const plans = planning.goalPlans.filter((p) => p.status !== "COMPLETED");
  const sp = planning.savingsPlan;
  const ap = planning.appreciation;

  // 1. "Save this amount" per goal (priority order from the allocator)
  for (const a of sp.allocations.slice(0, 3)) {
    const p = plans.find((x) => x.goalId === a.goalId);
    if (!p) continue;
    if (p.requiredMonthly == null) {
      insights.push({ title: `Plan a date for ${p.name}`, detail: p.advice, category: "GOAL", amount: p.monthlyPace || null });
      continue;
    }
    const later = a.shortfall > 0 && a.suggestedDeadline
      ? ` With your current capacity you can put ${inr(a.allocated)}/month here, which reaches it by ${monthLabel(a.suggestedDeadline)}.`
      : "";
    insights.push({ title: `Save ${inr(p.requiredMonthly)}/month for ${p.name}`, detail: p.advice + later, category: "GOAL", amount: p.requiredMonthly });
  }

  // 2. Overall allocation
  if (sp.allocations.length > 0) {
    insights.push({
      title:    sp.shortfall > 0 ? "Close your goal funding gap" : "All goals fit your budget",
      detail:   sp.summary,
      category: "SAVING",
      amount:   sp.shortfall > 0 ? sp.shortfall : planning.monthlySavingsCapacity,
    });
  }

  // 3. Appreciation / spending discipline
  if (ap?.eligible) {
    insights.push({ title: ap.title, detail: `${ap.message} ${ap.suggestion ?? ""}`.trim(), category: "APPRECIATION", amount: ap.savedSoFar });
  } else if (ap?.level === "OVER") {
    insights.push({ title: "Slow down day-to-day spending", detail: ap.message, category: "SPENDING", amount: null });
  }

  // 4. Inflation on yearly expenses
  const y = planning.yearlyProjection;
  const next = y.projections.find((p) => p.years === 1);
  const five = y.projections.find((p) => p.years === 5);
  if (y.annualBaseline > 0 && next && five) {
    insights.push({
      title:  `Inflation adds ${inr(next.increase)} to next year`,
      detail: `Your yearly living cost of ${inr(y.annualBaseline)} becomes ${inr(next.annual)} next year and ${inr(five.annual)} in 5 years at a blended ${y.blendedRate}% inflation. ` +
              `Raise your monthly savings by about ${inr(next.increase / 12)} each year and keep long-term goal money in inflation-beating options (index funds, PPF) rather than a savings account.`,
      category: "INFLATION",
      amount: next.increase,
    });
  }

  // 5. Category overrun
  const top = forecast.categoryForecasts.filter((c) => c.willExceed).sort((a, b) => b.expectedExcess - a.expectedExcess)[0];
  if (top) {
    insights.push({
      title:  `Rein in ${top.category.toLowerCase()} spending`,
      detail: `${top.category} is projected at ${inr(top.projected)} against a ${inr(top.budget)} limit (over by ${inr(top.expectedExcess)}). Trim it for the rest of the month to protect your goal savings.`,
      category: "SPENDING", amount: top.expectedExcess,
    });
  } else if (forecast.willExceedBudget) {
    insights.push({ title: "Total spending is trending over budget", detail: `Projected month-end spend is ${inr(forecast.projectedMonthlyExpense)}, ${inr(forecast.expectedExcess)} over budget. Review discretionary purchases.`, category: "SPENDING", amount: forecast.expectedExcess });
  }

  // 6. Obligation cover
  if (state.totalUpcomingAmount > 0 && state.cashBalance < state.totalUpcomingAmount * 1.2) {
    insights.push({
      title:  "Protect cash for upcoming bills",
      detail: `Upcoming obligations of ${inr(state.totalUpcomingAmount)} are close to your cash balance of ${inr(state.cashBalance)}. Avoid large non-essential purchases until they are paid.`,
      category: "RISK", amount: state.totalUpcomingAmount,
    });
  }

  // Put what the user asked about first
  const focus: InsightCategory[] =
    /inflation|price|future cost/.test(q)                ? ["INFLATION", "GOAL"] :
    /appreciat|how am i|doing|discipline|safe/.test(q)    ? ["APPRECIATION", "SPENDING"] :
    /risk|emi|loan|obligation|bill/.test(q)              ? ["RISK", "SPENDING"] :
    /food|budget|spend|overspend|shopping/.test(q)       ? ["SPENDING", "APPRECIATION"] :
    /goal|save|saving|allocate|priorit|vacation|trip/.test(q) ? ["GOAL", "SAVING"] : [];
  const rank = (c: InsightCategory) => { const i = focus.indexOf(c); return i < 0 ? focus.length : i; };
  const ordered = insights
    .map((ins, idx) => ({ ins, idx }))
    .sort((a, b) => rank(a.ins.category) - rank(b.ins.category) || a.idx - b.idx)
    .map((x) => x.ins)
    .slice(0, 6);

  if (ordered.length === 0) {
    ordered.push({ title: "Start with a budget and a goal", detail: "Add a monthly budget and at least one savings goal so WealthMap can build a personalised plan for you.", category: "SAVING", amount: null });
  }

  const goalTotal = sp.allocations.reduce((s, a) => s + a.allocated, 0);
  const summary = [
    ap?.eligible ? `You're ${inr(ap.savedSoFar)} under your safe-to-spend this month — well done.` : "",
    goalTotal > 0 ? `Put ${inr(goalTotal)}/month towards your goals${sp.shortfall > 0 ? `, and find ${inr(sp.shortfall)} more to hit every deadline` : ""}.` : "",
    y.annualBaseline > 0 ? `Plan for ${y.blendedRate}% yearly inflation on your living costs.` : "",
  ].filter(Boolean).join(" ") || "Here is your personalised financial plan.";

  return { summary, insights: ordered, recommendations: ordered.map((i) => `${i.title} — ${i.detail}`) };
};
