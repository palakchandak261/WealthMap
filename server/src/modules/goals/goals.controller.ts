import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";
import {
  createGoalService, getGoalsService, updateGoalService,
  contributeToGoalService, deleteGoalService,
} from "./goals.service";

export const createGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await createGoalService(req.userId!, req.body), "Goal created", 201); }
  catch (err) { next(err); }
};

export const getGoals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const raw  = req.query.inflationRate;
    const rate = raw !== undefined && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
    ok(res, await getGoalsService(req.userId!, { inflationRate: rate }));
  }
  catch (err) { next(err); }
};

export const updateGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await updateGoalService(req.userId!, req.params.id, req.body), "Goal updated"); }
  catch (err) { next(err); }
};

export const contributeToGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ok(res, await contributeToGoalService(req.userId!, req.params.id, req.body), "Contribution added");
  } catch (err) { next(err); }
};

export const deleteGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await deleteGoalService(req.userId!, req.params.id); ok(res, null, "Goal deleted"); }
  catch (err) { next(err); }
};
