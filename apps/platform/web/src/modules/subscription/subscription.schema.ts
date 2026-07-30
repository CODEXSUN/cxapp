import { z } from "zod";
export const subscriptionSchema = z.object({
  billingCycle: z.enum(["monthly", "annual"]),
  endsOn: z.string().nullable(),
  planId: z.number().int().positive(),
  startsOn: z.string().min(10),
  status: z.enum(["active", "cancelled", "expired", "trial"]),
  tenantId: z.number().int().positive()
});
