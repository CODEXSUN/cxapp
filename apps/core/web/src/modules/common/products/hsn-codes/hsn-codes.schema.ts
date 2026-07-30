import { z } from "zod";

export const hsnCodesSchema = z.object({
  code: z.string().trim().min(1, "Code is required.").max(200),
  description: z.string().trim().min(1, "Description is required.").max(200),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative.")
});
