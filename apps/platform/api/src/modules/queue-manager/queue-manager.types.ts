export type QueueBackend = "bullmq-redis" | "database";
export type QueueJobStatus = "cancelled" | "completed" | "failed" | "pending" | "running";

export type QueueJobPayload = {
  actorEmail?: string;
  availableAt?: string;
  correlationId?: string;
  idempotencyKey?: string;
  jobName: string;
  maxAttempts?: number;
  payload: Record<string, unknown>;
  priority?: number;
  queueName: string;
  sourceModule: string;
  tenantId?: string | null;
};

export type QueueJobFilters = {
  correlationId?: string;
  queueName?: string;
  status?: QueueJobStatus;
  tenantId?: string;
};

export type QueueJobRecord = {
  actorEmail: string | null;
  attempts: number;
  availableAt: string;
  completedAt: string | null;
  correlationId: string | null;
  createdAt: string;
  errorMessage: string | null;
  id: number;
  idempotencyKey: string | null;
  jobName: string;
  maxAttempts: number;
  payload: Record<string, unknown>;
  priority: number;
  queueName: string;
  result: Record<string, unknown>;
  sourceModule: string;
  startedAt: string | null;
  status: QueueJobStatus;
  tenantId: string | null;
  updatedAt: string;
  uuid: string;
};

export type QueueRuntimeSettings = {
  backend: QueueBackend;
  backendLabel: string;
  canRunInline: boolean;
  availableBackends: QueueBackend[];
  redisConfigured: boolean;
  updatedAt: string | null;
  updatedBy: string;
  pending: number;
  running: number;
  failed: number;
  completed: number;
};
