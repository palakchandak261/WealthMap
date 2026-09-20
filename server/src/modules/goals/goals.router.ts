import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { createGoal, getGoals, updateGoal, contributeToGoal, deleteGoal } from "./goals.controller";

export const goalsRouter = Router();

goalsRouter.use(authenticate);

goalsRouter.post("/",                  createGoal);
goalsRouter.get("/",                   getGoals);
goalsRouter.patch("/:id",              updateGoal);
goalsRouter.patch("/:id/contribute",   contributeToGoal);  // add savings to a goal
goalsRouter.delete("/:id",             deleteGoal);
