import { z } from "zod";
import { GOAL_CATEGORIES } from "../../lib/finance";

const GoalCategory = z.enum(GOAL_CATEGORIES);
const GoalPriority = z.enum(["HIGH", "MEDIUM", "LOW"]);
const GoalStatus   = z.enum(["ACTIVE", "COMPLETED", "PAUSED", "ABANDONED"]);

// "" or null clears the deadline; any other string must be a valid date
const Deadline = z
  .union([z.string(), z.null()])
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || !Number.isNaN(new Date(v).getTime()), "Deadline must be a valid date");

export const CreateGoalSchema = z.object({
  name:          z.string().trim().min(1, "Goal name is required").max(100),
  targetAmount:  z.number().positive("Target amount must be positive"),
  currentAmount: z.number().nonnegative().optional(),
  deadline:      Deadline.optional(),
  status:        GoalStatus.optional(),
  category:      GoalCategory.default("OTHER"),
  priority:      GoalPriority.default("MEDIUM"),
  inflationRate: z.number().min(0).max(50).nullable().optional(),
});

export const UpdateGoalSchema = z.object({
  name:          z.string().trim().min(1).max(100).optional(),
  targetAmount:  z.number().positive().optional(),
  currentAmount: z.number().nonnegative().optional(),
  deadline:      Deadline.optional(),
  status:        GoalStatus.optional(),
  category:      GoalCategory.optional(),
  priority:      GoalPriority.optional(),
  inflationRate: z.number().min(0).max(50).nullable().optional(),
});

export const ContributeSchema = z.object({
  amount:        z.number().positive("Contribution must be positive"),
  note:          z.string().trim().max(120).optional(),
  contributedAt: z.string().optional()
    .refine((v) => v === undefined || !Number.isNaN(new Date(v).getTime()), "contributedAt must be a valid date"),
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;
