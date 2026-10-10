import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { CreateGoalSchema, UpdateGoalSchema, ContributeSchema } from "./goals.schemas";
import { createGoal, getGoals, updateGoal, contributeToGoal, deleteGoal } from "./goals.controller";

export const goalsRouter = Router();

goalsRouter.use(authenticate);

goalsRouter.post("/",                  validate(CreateGoalSchema),    createGoal);
goalsRouter.get("/",                   getGoals);
goalsRouter.patch("/:id",              validate(UpdateGoalSchema),    updateGoal);
goalsRouter.patch("/:id/contribute",   validate(ContributeSchema),    contributeToGoal);
goalsRouter.delete("/:id",             deleteGoal);
