import { z } from "zod";
export const planSchema = z.object({
  annualPrice: z.number().nonnegative(),
  code: z.string().min(1),
  companyLimit: z.number().int().nonnegative(),
  description: z.string(),
  monthlyPrice: z.number().nonnegative(),
  name: z.string().min(1),
  status: z.enum(["active", "inactive"]),
  userLimit: z.number().int().nonnegative()
});
