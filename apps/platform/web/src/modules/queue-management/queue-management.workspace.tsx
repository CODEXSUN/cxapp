import { useState } from "react";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { QueueManagementForm } from "./queue-management.form";
import {
  useQueueJobMutations,
  useQueueJobsQuery,
  useQueueRuntimeQuery
} from "./queue-management.hooks";
import { QueueManagementList } from "./queue-management.list";
import type { QueueJobFilters } from "./queue-management.types";
import { toast } from "sonner";

export function QueueManagementWorkspace() {
  const [filters, setFilters] = useState<QueueJobFilters>({
    correlationId: "",
    queueName: "",
    status: "",
    tenantId: ""
  });
  const jobs = useQueueJobsQuery(filters);
  const settings = useQueueRuntimeQuery();
  const mutations = useQueueJobMutations();
  const busy =
    mutations.cancel.isPending ||
    mutations.cleanup.isPending ||
    mutations.retry.isPending ||
    mutations.run.isPending ||
    mutations.switchBackend.isPending;
  return (
    <WorkspacePage
      title="Queue Management"
      description="Switch and operate in-memory, database, or BullMQ + Redis queues while retaining job audit metadata."
      technicalName="page.queue-management"
    >
      <div className="rounded-md border bg-card p-3 shadow-sm">
        <QueueManagementForm
          filters={filters}
          loading={jobs.isLoading || settings.isLoading || busy}
          settings={settings.data}
          onBackendChange={(backend) =>
            mutations.switchBackend.mutate(backend, {
              onError: (error) => toast.error(error.message),
              onSuccess: (result) =>
                toast.success(`Queue backend switched to ${result.backendLabel}.`)
            })
          }
          onCleanup={() => mutations.cleanup.mutate()}
          onFiltersChange={setFilters}
          onRefresh={() => {
            void jobs.refetch();
            void settings.refetch();
          }}
        />
      </div>
      <QueueManagementList
        busy={busy}
        jobs={jobs.data ?? []}
        settings={settings.data}
        onCancel={(id) => mutations.cancel.mutate(id)}
        onRetry={(id) => mutations.retry.mutate(id)}
        onRun={(id) => mutations.run.mutate(id)}
      />
    </WorkspacePage>
  );
}
