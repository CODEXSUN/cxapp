import { z } from "zod";

export const prioritiesSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  colour: z.string().trim().min(1, "Colour is required.").max(200),
  tag: z.string().trim().min(1, "Tag is required.").max(200),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative.")
});
