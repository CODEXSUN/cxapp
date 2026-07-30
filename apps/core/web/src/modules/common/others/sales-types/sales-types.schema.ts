import { z } from "zod";

export const salesTypesSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().trim().max(200).nullable().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative.")
});
