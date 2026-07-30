import { z } from "zod";
import { normalizeTenantDomain } from "./tenant-domain.services";

export const tenantDomainSchema = z.object({
  domain: z
    .string()
    .transform(normalizeTenantDomain)
    .pipe(z.string().min(1, "Domain is required.").max(191)),
  tenantId: z.number().int().positive("Tenant is required.")
});

export type TenantDomainFormValues = z.infer<typeof tenantDomainSchema>;
