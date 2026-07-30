export async function processPlanJob(
  job: { planId: number },
  refresh: (id: number) => Promise<void>
) {
  await refresh(job.planId);
  return { processed: job.planId };
}
