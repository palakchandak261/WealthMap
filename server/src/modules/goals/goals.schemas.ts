import { z } from "zod";

export const CreateGoalSchema = z.object({
  name:          z.string().min(1, "Goal name is required").max(100),
  targetAmount:  z.number().positive("Target amount must be positive"),
  currentAmount: z.number().nonnegative().optional(),
  deadline:      z.string().optional(),
});

export const UpdateGoalSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().nonnegative().optional(),
  deadline:     z.string().optional(),
  status:       z.enum(["ACTIVE","COMPLETED","PAUSED","ABANDONED"]).optional(),
});

export const ContributeSchema = z.object({
  amount: z.number().positive("Contribution must be positive"),
});
