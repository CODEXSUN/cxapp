import { z } from "zod";
export const pincodeSchema = z.object({
  cityId: z.number().int().positive("City is required."),
  name: z
    .string()
    .trim()
    .min(2, "Postal code must contain at least two characters.")
    .max(20, "Postal code cannot exceed 20 characters.")
    .regex(
      /^[A-Za-z0-9](?:[A-Za-z0-9 -]*[A-Za-z0-9])?$/,
      "Postal code may contain letters, numbers, spaces, and hyphens."
    ),
  area: z.string().trim().min(1, "Area is required.").max(200),
  sortOrder: z.number().int().min(0),
  status: z.enum(["active", "inactive"])
});
