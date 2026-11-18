import { z } from "zod";
import { GOAL_CATEGORIES } from "../../lib/finance";

const MAX_ROWS = 5000;
const DateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "must be a valid date");
const Frequency = z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

export const ImportExpenseSchema = z.object({
  category:      z.string().trim().min(1).max(40).transform((s) => s.toUpperCase()),
  amount:        z.number().positive().max(1e11),
  description:   z.string().trim().max(200).optional().nullable(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "NET_BANKING", "OTHER"]).default("OTHER"),
  isRecurring:   z.boolean().default(false),
  spentAt:       DateString,
});

export const ImportIncomeSchema = z.object({
  source:      z.string().trim().min(1).max(120),
  amount:      z.number().positive().max(1e11),
  frequency:   Frequency.default("MONTHLY"),
  isRecurring: z.boolean().default(true),
  receivedAt:  DateString,
});

export const ImportObligationSchema = z.object({
  name:        z.string().trim().min(1).max(100),
  type:        z.enum(["EMI", "RENT", "BILL", "SUBSCRIPTION", "INSURANCE", "LOAN", "OTHER"]).default("OTHER"),
  amount:      z.number().positive().max(1e11),
  dueDate:     DateString,
  frequency:   Frequency.default("MONTHLY"),
  isRecurring: z.boolean().default(true),
  isPaid:      z.boolean().default(false),
});

export const ImportGoalSchema = z.object({
  name:          z.string().trim().min(1).max(100),
  targetAmount:  z.number().positive().max(1e12),
  currentAmount: z.number().nonnegative().default(0),
  deadline:      DateString.optional().nullable(),
  status:        z.enum(["ACTIVE", "COMPLETED", "PAUSED", "ABANDONED"]).optional(),
  category:      z.enum(GOAL_CATEGORIES).default("OTHER"),
  priority:      z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  inflationRate: z.number().min(0).max(50).nullable().optional(),
});

export const ImportBudgetSchema = z.object({
  month:       z.number().int().min(1).max(12),
  year:        z.number().int().min(2000).max(2100),
  totalBudget: z.number().positive().optional().nullable(),
  categories:  z.array(z.object({
    category: z.string().trim().min(1).max(40).transform((s) => s.toUpperCase()),
    limit:    z.number().positive(),
  })).max(100).default([]),
});

export const ImportPayloadSchema = z.object({
  expenses:    z.array(ImportExpenseSchema).max(MAX_ROWS).default([]),
  incomes:     z.array(ImportIncomeSchema).max(MAX_ROWS).default([]),
  obligations: z.array(ImportObligationSchema).max(MAX_ROWS).default([]),
  goals:       z.array(ImportGoalSchema).max(500).default([]),
  budgets:     z.array(ImportBudgetSchema).max(120).default([]),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
  }).default({}),
}).refine(
  (p) => p.expenses.length + p.incomes.length + p.obligations.length + p.goals.length + p.budgets.length > 0,
  "Nothing to import — the file has no valid rows"
);

export type ImportPayload = z.infer<typeof ImportPayloadSchema>;
