import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { addIncomeService, getIncomesService, updateIncomeService, deleteIncomeService } from "./income.service";
import { ok } from "../../lib/response";

export const addIncome = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await addIncomeService(req.userId!, req.body), "Income added", 201); }
  catch (err) { next(err); }
};

export const getIncomes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    ok(res, await getIncomesService(req.userId!, year));
  } catch (err) { next(err); }
};

export const updateIncome = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await updateIncomeService(req.userId!, req.params.id, req.body), "Income updated"); }
  catch (err) { next(err); }
};

export const deleteIncome = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await deleteIncomeService(req.userId!, req.params.id); ok(res, null, "Income deleted"); }
  catch (err) { next(err); }
};
