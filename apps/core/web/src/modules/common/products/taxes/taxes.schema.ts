import { z } from "zod";

export const taxesSchema = z.object({
  ratePercent: z.number().min(0, "Rate percent cannot be negative."),
  description: z.string().trim().min(1, "Description is required.").max(200),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative.")
});
