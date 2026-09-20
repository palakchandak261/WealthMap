import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createExpense, getExpenses, getExpenseById,
  updateExpense, deleteExpense, getDailyTimeline,
} from "./expenses.controller";

export const expensesRouter = Router();

expensesRouter.use(authenticate);

expensesRouter.post("/",               createExpense);
expensesRouter.get("/",                getExpenses);
expensesRouter.get("/daily-timeline",  getDailyTimeline);  // before /:id
expensesRouter.get("/:id",             getExpenseById);
expensesRouter.patch("/:id",           updateExpense);
expensesRouter.delete("/:id",          deleteExpense);
