export type PurchaseWorkerJob = {
  id: string;
  name: "purchase.confirmation-sync" | "purchase.activity-sync";
  payload: { action: string; id: string; salesInvoiceNo?: string };
};

export async function processPurchaseJob(job: PurchaseWorkerJob) {
  return {
    action: job.payload.action,
    purchaseId: job.payload.id,
    processed: true,
    processedAt: new Date().toISOString()
  };
}
