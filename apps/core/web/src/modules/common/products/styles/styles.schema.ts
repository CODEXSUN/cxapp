import { z } from "zod";

export const stylesSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative.")
});
