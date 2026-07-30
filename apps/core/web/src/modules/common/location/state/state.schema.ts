import { z } from "zod";

export const stateSchema = z.object({
  countryId: z.number().int().positive("Country is required."),
  code: z
    .string()
    .trim()
    .min(1, "State code is required.")
    .max(80)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2, "State name is required.").max(200),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative."),
  status: z.enum(["active", "inactive"])
});
