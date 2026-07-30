import { z } from "zod";
export const productSchema = z.object({
  name: z.string().min(1),
  openingStock: z.number().nonnegative(),
  openingRate: z.number().nonnegative()
});
