export async function processIndustryJob(
  job: { industryId: number },
  refresh: (id: number) => Promise<void>
) {
  await refresh(job.industryId);
  return { processed: job.industryId };
}
