import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";
import {
  createBudgetService,
  listBudgetsService,
  getCurrentBudgetService,
  getBudgetByIdService,
  updateBudgetService,
  deleteBudgetService,
} from "./budgets.service";

export const createBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await createBudgetService(req.userId!, req.body), "Budget saved", 201); }
  catch (err) { next(err); }
};

export const listBudgets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await listBudgetsService(req.userId!)); }
  catch (err) { next(err); }
};

export const getCurrentBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await getCurrentBudgetService(req.userId!)); }
  catch (err) { next(err); }
};

export const getBudgetById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await getBudgetByIdService(req.userId!, req.params.id)); }
  catch (err) { next(err); }
};

export const updateBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await updateBudgetService(req.userId!, req.params.id, req.body), "Budget updated"); }
  catch (err) { next(err); }
};

export const deleteBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await deleteBudgetService(req.userId!, req.params.id); ok(res, null, "Budget deleted"); }
  catch (err) { next(err); }
};
