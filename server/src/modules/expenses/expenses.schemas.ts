import { z } from "zod";

const PaymentMethod = z.enum(["CASH", "UPI", "CARD", "NET_BANKING", "OTHER"]);

export const CreateExpenseSchema = z.object({
  category:      z.string().min(1, "Category is required"),
  amount:        z.number({ required_error: "Amount is required" }).positive("Amount must be positive"),
  description:   z.string().max(200).optional(),
  paymentMethod: PaymentMethod.default("OTHER"),
  isRecurring:   z.boolean().default(false),
  spentAt:       z.string({ required_error: "Date is required" }),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

// Accepts { items: [...] } or a bare array of expenses (CSV / Excel upload)
export const BulkExpensesSchema = z.preprocess(
  (body) => (Array.isArray(body) ? { items: body } : body),
  z.object({
    items: z.array(
      CreateExpenseSchema.extend({
        category: z.string().trim().min(1).max(40).transform((s) => s.toUpperCase()),
        spentAt:  z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "must be a valid date"),
      })
    ).min(1, "No expenses to import").max(5000),
  })
);
