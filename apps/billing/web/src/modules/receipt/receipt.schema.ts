import { z } from "zod";

const decimalInput = z
  .union([z.string(), z.number()])
  .refine((value) => String(value).trim() !== "" && Number.isFinite(Number(value)), {
    message: "Enter a valid decimal value."
  });
const optionalDecimalInput = z.union([decimalInput, z.literal("")]);

export const receiptSchema = z.object({
  allocations: z.array(
    z.object({
      allocatedAmount: decimalInput.refine((value) => Number(value) > 0, {
        message: "Allocation must be greater than zero."
      }),
      saleId: z.string().regex(/^[0-9a-f]{8}$/)
    })
  ),
  amount: decimalInput.refine((value) => Number(value) >= 0, {
    message: "Amount must be zero or more."
  }),
  companyId: z.number().int().positive("Default Company is required."),
  currencyId: z.number().int().positive("Currency is required."),
  customerId: z.number().int().positive("Customer is required."),
  discountAmount: optionalDecimalInput.refine((value) => value === "" || Number(value) >= 0),
  financialYearId: z.number().int().positive("Financial Year is required."),
  ledgerId: z.number().int().nonnegative(),
  notes: z.string(),
  receiptDate: z.iso.date("Receipt date is required."),
  receiptMode: z.enum(["cash", "bank", "upi", "transfer"]),
  receiptNumber: z.string(),
  referenceDate: z.union([z.iso.date(), z.literal("")]),
  referenceNo: z.string(),
  roundOff: optionalDecimalInput,
  tdsAmount: optionalDecimalInput.refine((value) => value === "" || Number(value) >= 0)
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
