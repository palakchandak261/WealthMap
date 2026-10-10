import { z } from "zod";

const CategoryBudgetSchema = z.object({
  category: z.string().min(1),
  limit:    z.number().positive("Category limit must be positive"),
});

export const CreateBudgetSchema = z.object({
  month:           z.number().int().min(1).max(12),
  year:            z.number().int().min(2020).max(2100),
  totalBudget:     z.number().positive("Total budget must be positive"),
  categoryBudgets: z.array(CategoryBudgetSchema).default([]),
});

export const UpdateBudgetSchema = z.object({
  totalBudget:     z.number().positive().optional(),
  categoryBudgets: z.array(CategoryBudgetSchema).optional(),
});
