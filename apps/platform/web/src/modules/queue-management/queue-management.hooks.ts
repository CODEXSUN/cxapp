import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queueFiltersSchema, queueJobAction } from "./queue-management.schema";
import {
  cancelQueueJob,
  cleanupQueueJobs,
  getQueueRuntimeSettings,
  listQueueJobs,
  retryQueueJob,
  runQueueJob,
  switchQueueBackend
} from "./queue-management.services";
import type { QueueBackend, QueueJobFilters } from "./queue-management.types";

export const queueManagementQueryKey = ["admin", "queue-management"] as const;

export function useQueueRuntimeQuery() {
  return useQuery({
    queryFn: getQueueRuntimeSettings,
    queryKey: [...queueManagementQueryKey, "settings"],
    meta: { suppressGlobalLoader: true },
    refetchInterval: 10_000
  });
}

export function useQueueJobsQuery(filters: QueueJobFilters) {
  const parsed = queueFiltersSchema.parse(filters);
  return useQuery({
    queryFn: () => listQueueJobs(parsed),
    queryKey: [...queueManagementQueryKey, "jobs", parsed],
    meta: { suppressGlobalLoader: true },
    refetchInterval: 10_000
  });
}

export function useQueueJobMutations() {
  const client = useQueryClient();
  const done = () => {
    void client.invalidateQueries({ queryKey: queueManagementQueryKey });
    void client.invalidateQueries({ queryKey: ["admin", "database"] });
  };
  return {
    cancel: useMutation({
      mutationFn: (id: number) => cancelQueueJob(queueJobAction(id).id),
      onSuccess: done
    }),
    cleanup: useMutation({ mutationFn: cleanupQueueJobs, onSuccess: done }),
    retry: useMutation({
      mutationFn: (id: number) => retryQueueJob(queueJobAction(id).id),
      onSuccess: done
    }),
    run: useMutation({
      mutationFn: (id: number) => runQueueJob(queueJobAction(id).id),
      onSuccess: done
    }),
    switchBackend: useMutation({
      mutationFn: (backend: QueueBackend) => switchQueueBackend(backend),
      onSuccess: done
    })
  };
}
