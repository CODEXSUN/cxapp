export async function processPlatformActivityJob(
  job: { activityId: number },
  publish: (id: number) => Promise<void>
) {
  await publish(job.activityId);
  return { processed: job.activityId };
}
