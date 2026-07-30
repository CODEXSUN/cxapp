import type { ReceiptJob } from "./receipt.types.js";

export const receiptWorkerPolicy = {
  attempts: 3,
  idempotencyKey: (job: ReceiptJob) => `${job.tenantDatabase}:${job.name}:${job.receiptId}`
};

export async function processReceiptJob(job: ReceiptJob) {
  if (job.name !== "receipt.post") throw new Error(`Unsupported Receipt job: ${job.name}`);
  return {
    correlationId: job.correlationId,
    processed: true,
    receiptId: job.receiptId,
    tenantDatabase: job.tenantDatabase
  };
}
