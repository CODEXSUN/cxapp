import { normalizeTenantDomain } from "./tenant-domain.repository.js";

export type TenantDomainJob = {
  correlationId: string;
  domain: string;
  name: "tenant-domain.normalize";
  tenantId: number;
};

export const tenantDomainWorker = {
  jobs: ["tenant-domain.normalize"],
  maxAttempts: 3
} as const;

export async function processTenantDomainJob(job: TenantDomainJob) {
  const domain = normalizeTenantDomain(job.domain);
  if (!domain) throw new Error("Tenant domain job requires a valid domain.");
  return { correlationId: job.correlationId, domain, tenantId: job.tenantId };
}
