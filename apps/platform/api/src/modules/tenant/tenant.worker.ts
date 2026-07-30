export type TenantJob = {
  correlationId: string;
  name: "tenant.provision";
  tenantId: number;
};

export const tenantWorker = {
  jobs: ["tenant.provision"],
  maxAttempts: 3
} as const;

export async function processTenantJob(
  job: TenantJob,
  provision: (tenantId: number) => Promise<void>
) {
  await provision(job.tenantId);
  return { correlationId: job.correlationId, status: "completed" as const, tenantId: job.tenantId };
}
