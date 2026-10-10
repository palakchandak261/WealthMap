import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { CreateBudgetSchema, UpdateBudgetSchema } from "./budgets.schemas";
import {
  createBudget, getCurrentBudget, getBudgetById, updateBudget, deleteBudget,
} from "./budgets.controller";

export const budgetsRouter = Router();

budgetsRouter.use(authenticate);

budgetsRouter.post("/",         validate(CreateBudgetSchema), createBudget);
budgetsRouter.get("/current",   getCurrentBudget);
budgetsRouter.get("/:id",       getBudgetById);
budgetsRouter.patch("/:id",     validate(UpdateBudgetSchema), updateBudget);
budgetsRouter.delete("/:id",    deleteBudget);
