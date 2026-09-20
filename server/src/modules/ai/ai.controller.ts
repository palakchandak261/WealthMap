import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";
import { buildFinancialState } from "../engines/financialState.service";
import { runForecastingEngine } from "../engines/forecasting.service";
import { runRiskEngine } from "../engines/risk.service";
import { runHealthScoreEngine } from "../engines/healthScore.service";
import { getRecommendationsService } from "./ai.service";

export const getRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Run all engines to get structured data first
    const state    = await buildFinancialState(userId);
    const forecast = await runForecastingEngine(userId, state);
    const risk     = await runRiskEngine(userId, state, forecast);
    const health   = runHealthScoreEngine(state, forecast, risk);

    const result = await getRecommendationsService(state, forecast, risk, health);

    ok(res, {
      recommendations: result.recommendations,
      context: {
        riskScore:   risk.riskScore,
        riskLevel:   risk.riskLevel,
        healthScore: health.total,
        healthGrade: health.grade,
        willExceedBudget: forecast.willExceedBudget,
      },
    });
  } catch (err) { next(err); }
};
