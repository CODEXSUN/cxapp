export type QuotationWorkerJob = {
  id: string;
  name: "quotation.confirmation-sync" | "quotation.activity-sync";
  payload: { action: string; id: string; salesInvoiceNo?: string };
};

export async function processQuotationJob(job: QuotationWorkerJob) {
  return {
    action: job.payload.action,
    quotationId: job.payload.id,
    processed: true,
    processedAt: new Date().toISOString()
  };
}
