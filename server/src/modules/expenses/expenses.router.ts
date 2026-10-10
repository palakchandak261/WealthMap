import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { CreateExpenseSchema, UpdateExpenseSchema } from "./expenses.schemas";
import {
  createExpense, getExpenses, getExpenseById,
  updateExpense, deleteExpense, getDailyTimeline,
} from "./expenses.controller";

export const expensesRouter = Router();

expensesRouter.use(authenticate);

expensesRouter.post("/",               validate(CreateExpenseSchema), createExpense);
expensesRouter.get("/",                getExpenses);
expensesRouter.get("/daily-timeline",  getDailyTimeline);
expensesRouter.get("/:id",             getExpenseById);
expensesRouter.patch("/:id",           validate(UpdateExpenseSchema), updateExpense);
expensesRouter.delete("/:id",          deleteExpense);
