export async function processSubscriptionJob(
  job: { subscriptionId: number },
  apply: (id: number) => Promise<void>
) {
  await apply(job.subscriptionId);
  return { processed: job.subscriptionId };
}
