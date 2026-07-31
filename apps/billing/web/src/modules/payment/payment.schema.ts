import { z } from "zod";

const decimalInput = z
  .union([z.string(), z.number()])
  .refine((value) => String(value).trim() !== "" && Number.isFinite(Number(value)), {
    message: "Enter a valid decimal value."
  });
const optionalDecimalInput = z.union([decimalInput, z.literal("")]);

export const paymentSchema = z.object({
  allocations: z.array(
    z.object({
      allocatedAmount: decimalInput.refine((value) => Number(value) > 0, {
        message: "Allocation must be greater than zero."
      }),
      purchaseId: z.string().regex(/^[0-9a-f]{8}$/)
    })
  ),
  amount: decimalInput.refine((value) => Number(value) >= 0, {
    message: "Amount must be zero or more."
  }),
  companyId: z.number().int().positive("Default Company is required."),
  currencyId: z.number().int().positive("Currency is required."),
  supplierId: z.number().int().positive("Supplier is required."),
  discountAmount: optionalDecimalInput.refine((value) => value === "" || Number(value) >= 0),
  financialYearId: z.number().int().positive("Financial Year is required."),
  ledgerId: z.number().int().nonnegative(),
  notes: z.string(),
  paymentDate: z.iso.date("Payment date is required."),
  paymentMode: z.enum(["cash", "bank", "upi", "transfer"]),
  paymentNumber: z.string(),
  referenceDate: z.union([z.iso.date(), z.literal("")]),
  referenceNo: z.string(),
  roundOff: optionalDecimalInput,
  tdsAmount: optionalDecimalInput.refine((value) => value === "" || Number(value) >= 0)
});
export type PaymentFormErrors = Partial<Record<keyof z.infer<typeof paymentSchema>, string>>;
export function validatePayment(input: unknown) {
  const result = paymentSchema.safeParse(input);
  if (result.success) return { data: result.data, errors: {} as PaymentFormErrors };
  const errors: PaymentFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof PaymentFormErrors;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}
