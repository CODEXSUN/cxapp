export const salesWorker = {
  jobs: ["sales.post"],
  maxAttempts: 5
} as const;

export async function processSalesPosting(
  job: { saleId: string; tenantId: string },
  post: (saleId: string, tenantId: string) => Promise<void>
) {
  await post(job.saleId, job.tenantId);
  return { saleId: job.saleId, status: "posted" as const, tenantId: job.tenantId };
}
