import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/authenticate";
import { ok } from "../../lib/response";
import {
  createExpenseService, createBulkExpensesService, getExpensesService, getExpenseByIdService,
  updateExpenseService, deleteExpenseService, getDailyTimelineService,
} from "./expenses.service";

const now = new Date();

export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await createExpenseService(req.userId!, req.body), "Expense added", 201); }
  catch (err) { next(err); }
};

export const createBulkExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await createBulkExpensesService(req.userId!, req.body.items);
    ok(res, result, `${result.count} expenses imported`, 201);
  } catch (err) { next(err); }
};

export const getExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year, category } = req.query;
    ok(res, await getExpensesService(req.userId!, {
      month:    month    ? Number(month)    : undefined,
      year:     year     ? Number(year)     : undefined,
      category: category ? String(category) : undefined,
    }));
  } catch (err) { next(err); }
};

export const getExpenseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await getExpenseByIdService(req.userId!, req.params.id)); }
  catch (err) { next(err); }
};

export const updateExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { ok(res, await updateExpenseService(req.userId!, req.params.id, req.body), "Expense updated"); }
  catch (err) { next(err); }
};

export const deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await deleteExpenseService(req.userId!, req.params.id); ok(res, null, "Expense deleted"); }
  catch (err) { next(err); }
};

export const getDailyTimeline = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year  = req.query.year  ? Number(req.query.year)  : now.getFullYear();
    ok(res, await getDailyTimelineService(req.userId!, month, year));
  } catch (err) { next(err); }
};
