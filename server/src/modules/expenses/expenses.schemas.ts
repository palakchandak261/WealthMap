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
