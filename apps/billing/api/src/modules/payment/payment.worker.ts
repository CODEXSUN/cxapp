import type { PaymentJob } from "./payment.types.js";

export const paymentWorkerPolicy = {
  attempts: 3,
  idempotencyKey: (job: PaymentJob) => `${job.tenantDatabase}:${job.name}:${job.paymentId}`
};

export async function processPaymentJob(job: PaymentJob, sync: (job: PaymentJob) => Promise<void>) {
  await sync(job);
  return {
    correlationId: job.correlationId,
    processed: true,
    paymentId: job.paymentId,
    tenantDatabase: job.tenantDatabase
  };
}
