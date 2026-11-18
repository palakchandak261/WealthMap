import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";
import { buildFinancialState } from "../engines/financialState.service";
import { runForecastingEngine } from "../engines/forecasting.service";
import { runRiskEngine } from "../engines/risk.service";
import { runHealthScoreEngine } from "../engines/healthScore.service";
import { buildPlanningSnapshot } from "../engines/planning.service";
import { getRecommendationsService } from "./ai.service";

// POST /ai/recommendations  { context?: string, inflationRate?: number }
export const getRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId     = req.userId!;
    const userPrompt = typeof req.body?.context === "string" ? req.body.context.slice(0, 500) : undefined;
    const rate       = Number(req.body?.inflationRate);

    // Run all engines first — the AI only explains these numbers
    const state    = await buildFinancialState(userId);
    const forecast = await runForecastingEngine(userId, state);
    const risk     = await runRiskEngine(userId, state, forecast);
    const health   = runHealthScoreEngine(state, forecast, risk);
    const planning = await buildPlanningSnapshot(userId, state, forecast, {
      inflationRate: Number.isFinite(rate) && rate >= 0 && rate <= 50 ? rate : null,
    });

    const advice = await getRecommendationsService({ state, forecast, risk, health, planning, userPrompt });

    ok(res, {
      ...advice,
      goalPlans:    planning.goalPlans.filter((g) => g.status !== "COMPLETED"),
      savingsPlan:  planning.savingsPlan,
      appreciation: planning.appreciation,
      yearly: {
        annualBaseline: planning.yearlyProjection.annualBaseline,
        nextYear:       planning.yearlyProjection.projections.find((p) => p.years === 1)?.annual ?? 0,
        blendedRate:    planning.yearlyProjection.blendedRate,
      },
      context: {
        riskScore:        risk.riskScore,
        riskLevel:        risk.riskLevel,
        healthScore:      health.total,
        healthGrade:      health.grade,
        willExceedBudget: forecast.willExceedBudget,
        monthlySavingsCapacity: planning.monthlySavingsCapacity,
      },
    });
  } catch (err) { next(err); }
};
