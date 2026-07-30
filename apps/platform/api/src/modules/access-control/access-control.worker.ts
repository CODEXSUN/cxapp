export async function processAccessControlJob(
  job: { key: string },
  publish: (key: string) => Promise<void>
) {
  await publish(job.key);
  return { processed: job.key };
}
