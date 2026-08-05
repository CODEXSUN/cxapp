import { z } from "zod";

export const gstStatementFilingSchema = z.object({
  gstr1Arn: z.string().trim().max(80, "GSTR-1 ARN cannot exceed 80 characters."),
  gstr1FiledOn: z.string().nullable(),
  gstr3bArn: z.string().trim().max(80, "GSTR-3B ARN cannot exceed 80 characters."),
  gstr3bFiledOn: z.string().nullable(),
  month: z.number().int().min(1).max(12),
  openingBalance: z.number().finite("Opening balance must be a valid amount."),
  year: z.number().int().min(2000).max(2200)
});
