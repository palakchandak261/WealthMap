import { z } from "zod";

const ObligationType = z.enum(["EMI","RENT","BILL","SUBSCRIPTION","INSURANCE","LOAN","OTHER"]);
const Frequency = z.enum(["ONE_TIME","WEEKLY","BIWEEKLY","MONTHLY","QUARTERLY","YEARLY"]);

export const CreateObligationSchema = z.object({
  name:        z.string().min(1, "Name is required").max(100),
  type:        ObligationType,
  amount:      z.number().positive("Amount must be positive"),
  dueDate:     z.string({ required_error: "Due date is required" }),
  frequency:   Frequency.default("MONTHLY"),
  isRecurring: z.boolean().default(true),
});

export const UpdateObligationSchema = CreateObligationSchema.partial().extend({
  isPaid: z.boolean().optional(),
});
