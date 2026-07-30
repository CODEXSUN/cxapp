import { z } from "zod";

export const entitlementSchema = z
  .object({
    appId: z.number().int().positive(),
    endsOn: z.string().nullable(),
    moduleKey: z.string().min(1),
    planId: z.number().int().nullable(),
    scope: z.enum(["tenant", "plan"]),
    source: z.enum(["manual", "seed", "subscription"]),
    startsOn: z.string().min(10),
    status: z.enum(["active", "inactive"]),
    tenantId: z.number().int().nullable()
  })
  .refine((value) => value.scope !== "tenant" || Boolean(value.tenantId && value.tenantId > 0), {
    message: "Tenant is required.",
    path: ["tenantId"]
  })
  .refine((value) => value.scope !== "plan" || Boolean(value.planId && value.planId > 0), {
    message: "Plan is required.",
    path: ["planId"]
  });
