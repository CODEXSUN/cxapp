export const exportSalesWorker = {
  jobs: ["export-sales.post"],
  maxAttempts: 5
} as const;

export async function processExportSalesPosting(
  job: { exportSaleId: string; tenantId: string },
  post: (exportSaleId: string, tenantId: string) => Promise<void>
) {
  await post(job.exportSaleId, job.tenantId);
  return { exportSaleId: job.exportSaleId, status: "posted" as const, tenantId: job.tenantId };
}
