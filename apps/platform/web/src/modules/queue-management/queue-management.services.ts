import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  QueueCleanupResult,
  QueueJobFilters,
  QueueJobRecord,
  QueueRuntimeSettings
} from "./queue-management.types";
import type { QueueBackend } from "./queue-management.types";

export function getQueueRuntimeSettings() {
  return apiGet<QueueRuntimeSettings>("/admin/queue/settings", "sa");
}

export function listQueueJobs(filters?: Partial<QueueJobFilters>) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.queueName) params.set("queueName", filters.queueName);
  if (filters?.tenantId) params.set("tenantId", filters.tenantId);
  if (filters?.correlationId) params.set("correlationId", filters.correlationId);
  const query = params.toString();
  return apiGet<QueueJobRecord[]>(`/admin/queue/jobs${query ? `?${query}` : ""}`, "sa");
}

export function getQueueJob(id: number) {
  return apiGet<QueueJobRecord>(`/admin/queue/jobs/${id}`, "sa");
}

export function runQueueJob(id: number) {
  return apiPost<QueueJobRecord>(`/admin/queue/jobs/${id}/run`, {}, "sa");
}

export function retryQueueJob(id: number) {
  return apiPost<QueueJobRecord>(`/admin/queue/jobs/${id}/retry`, {}, "sa");
}

export function cancelQueueJob(id: number) {
  return apiPost<QueueJobRecord>(`/admin/queue/jobs/${id}/cancel`, {}, "sa");
}

export function cleanupQueueJobs() {
  return apiPost<QueueCleanupResult>("/admin/queue/cleanup", {}, "sa");
}

export function switchQueueBackend(backend: QueueBackend) {
  return apiPut<QueueRuntimeSettings>("/admin/queue/settings/backend", { backend }, "sa");
}
