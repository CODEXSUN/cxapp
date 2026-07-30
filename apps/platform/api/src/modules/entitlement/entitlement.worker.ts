export const entitlementWorker = {
  queue: "platform.entitlement",
  retries: 3
} as const;

export async function processEntitlementJob(
  job: { entitlementId: number },
  refresh: (id: number) => Promise<void>
) {
  await refresh(job.entitlementId);
  return { processed: job.entitlementId };
}
