import { z } from "zod";

export const receiptSchema = z.object({
  allocations: z.array(
    z.object({ allocatedAmount: z.number().positive(), saleId: z.string().regex(/^[0-9a-f]{8}$/) })
  ),
  amount: z.number().nonnegative("Amount must be zero or more."),
  companyId: z.number().int().positive("Default Company is required."),
  currencyId: z.number().int().positive("Currency is required."),
  customerId: z.number().int().positive("Customer is required."),
  discountAmount: z.number().nonnegative(),
  financialYearId: z.number().int().positive("Financial Year is required."),
  ledgerId: z.number().int().nonnegative(),
  notes: z.string(),
  receiptDate: z.iso.date("Receipt date is required."),
  receiptMode: z.enum(["cash", "bank", "upi", "transfer"]),
  receiptNumber: z.string(),
  referenceDate: z.union([z.iso.date(), z.literal("")]),
  referenceNo: z.string(),
  roundOff: z.number(),
  tdsAmount: z.number().nonnegative()
});
export type ReceiptFormErrors = Partial<Record<keyof z.infer<typeof receiptSchema>, string>>;
export function validateReceipt(input: unknown) {
  const result = receiptSchema.safeParse(input);
  if (result.success) return { data: result.data, errors: {} as ReceiptFormErrors };
  const errors: ReceiptFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ReceiptFormErrors;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}
