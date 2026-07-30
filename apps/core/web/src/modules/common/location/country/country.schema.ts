import { z } from "zod";

export const countrySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Country code is required.")
    .max(80)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2, "Country name is required.").max(200),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative."),
  status: z.enum(["active", "inactive"])
});
