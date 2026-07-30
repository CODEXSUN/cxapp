export const appRegistryWorker = {
  jobs: ["app-registry.publish-access"],
  maxAttempts: 3
} as const;

export async function processAppRegistryJob(
  job: { enabledAppIds: string[]; tenantId: number },
  publish: (tenantId: number, enabledAppIds: string[]) => Promise<void>
) {
  await publish(job.tenantId, job.enabledAppIds);
  return { published: job.enabledAppIds.length, tenantId: job.tenantId };
}
