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
