export type QueueJob<TPayload = unknown> = {
  actorEmail?: string;
  correlationId?: string;
  idempotencyKey?: string;
  jobName: string;
  payload: TPayload;
  requestId?: string;
  retry?: {
    attempts: number;
    backoffMs: number;
  };
  sourceModule?: string;
  tenantId?: string;
};

export type QueueAdapter = {
  enqueue<TPayload>(queueName: string, job: QueueJob<TPayload>): Promise<void>;
};

export class InMemoryQueueAdapter implements QueueAdapter {
  readonly jobs: Array<{ job: QueueJob; queueName: string }> = [];

  async enqueue<TPayload>(queueName: string, job: QueueJob<TPayload>) {
    this.jobs.push({ job, queueName });
  }
}
