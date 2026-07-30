import { z } from "zod";

export const monthsSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  startDate: z.string().trim().min(1, "Start date is required.").max(200),
  endDate: z.string().trim().min(1, "End date is required.").max(200),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative.")
});
