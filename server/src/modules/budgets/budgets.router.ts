import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createBudget,
  getCurrentBudget,
  getBudgetById,
  updateBudget,
  deleteBudget,
} from "./budgets.controller";

export const budgetsRouter = Router();

budgetsRouter.use(authenticate);

budgetsRouter.post("/",         createBudget);      // POST   /api/v1/budgets
budgetsRouter.get("/current",   getCurrentBudget);  // GET    /api/v1/budgets/current
budgetsRouter.get("/:id",       getBudgetById);     // GET    /api/v1/budgets/:id
budgetsRouter.patch("/:id",     updateBudget);      // PATCH  /api/v1/budgets/:id
budgetsRouter.delete("/:id",    deleteBudget);      // DELETE /api/v1/budgets/:id
