import { useEffect, useState } from "react";
import { RadioTowerIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { WorkspacePage } from "@cxapp/ui/workspace/page";
import { QueueManagementForm } from "./queue-management.form";
import {
  useQueueJobMutations,
  useQueueJobsQuery,
  useQueueRuntimeQuery
} from "./queue-management.hooks";
import { QueueManagementList } from "./queue-management.list";
import type { QueueBackend, QueueJobFilters } from "./queue-management.types";
import { toast } from "sonner";

export function QueueManagementWorkspace() {
  const [draftBackend, setDraftBackend] = useState<QueueBackend>("database");
  const [filters, setFilters] = useState<QueueJobFilters>(emptyQueueFilters);
  const jobs = useQueueJobsQuery(filters);
  const settings = useQueueRuntimeQuery();
  const mutations = useQueueJobMutations();
  const liveBackend = settings.data?.backend;
  const backendDirty = Boolean(liveBackend && draftBackend !== liveBackend);
  const filtersActive = Object.values(filters).some(Boolean);
  const busy =
    mutations.cancel.isPending ||
    mutations.cleanup.isPending ||
    mutations.retry.isPending ||
    mutations.run.isPending ||
    mutations.switchBackend.isPending;

  useEffect(() => {
    if (liveBackend) setDraftBackend(liveBackend);
  }, [liveBackend]);

  function publishBackend() {
    if (!backendDirty) return;
    if (
      !window.confirm(
        `Publish ${backendLabel(draftBackend)} as the live queue backend? Existing pending jobs will continue on the selected backend.`
      )
    )
      return;
    mutations.switchBackend.mutate(draftBackend, {
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        setDraftBackend(result.backend);
        toast.success(`${result.backendLabel} is now live.`);
      }
    });
  }

  function cleanupHistory() {
    if (
      !window.confirm(
        "Clean expired queue history? Only completed, cancelled, and failed jobs older than the configured retention period are removed."
      )
    )
      return;
    mutations.cleanup.mutate(undefined, {
      onError: (error) => toast.error(error.message),
      onSuccess: (result) =>
        toast.success(
          `Queue history cleaned: ${result.completedDeleted + result.failedDeleted} jobs removed.`
        )
    });
  }

  return (
    <WorkspacePage
      title="Queue Management"
      description="Monitor background jobs, recover failures, and control the live processing backend."
      technicalName="page.queue-management"
      actions={
        <>
          <Button
            disabled={!backendDirty || mutations.switchBackend.isPending}
            onClick={() => liveBackend && setDraftBackend(liveBackend)}
            type="button"
            variant="outline"
          >
            <RotateCcwIcon className="size-4" />
            Reset draft
          </Button>
          <Button
            disabled={!backendDirty || busy || settings.isLoading}
            onClick={publishBackend}
            type="button"
          >
            <RadioTowerIcon className="size-4" />
            {mutations.switchBackend.isPending ? "Publishing..." : "Publish live"}
          </Button>
        </>
      }
    >
      {settings.error || jobs.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {settings.error?.message ?? jobs.error?.message ?? "Queue data could not be loaded."}
        </div>
      ) : null}
      <div className="rounded-md border bg-card p-3 shadow-sm">
        <QueueManagementForm
          draftBackend={draftBackend}
          filters={filters}
          filtersActive={filtersActive}
          loading={jobs.isLoading || settings.isLoading || busy}
          settings={settings.data}
          onBackendChange={setDraftBackend}
          onCleanup={cleanupHistory}
          onFiltersChange={setFilters}
          onResetFilters={() => setFilters(emptyQueueFilters())}
          onRefresh={() => {
            void jobs.refetch();
            void settings.refetch();
          }}
        />
      </div>
      <QueueManagementList
        busy={busy}
        filtersActive={filtersActive}
        jobs={jobs.data ?? []}
        settings={settings.data}
        onCancel={(id) =>
          mutations.cancel.mutate(id, {
            onError: (error) => toast.error(error.message),
            onSuccess: () => toast.success("Queue job cancelled.")
          })
        }
        onResetFilters={() => setFilters(emptyQueueFilters())}
        onRetry={(id) =>
          mutations.retry.mutate(id, {
            onError: (error) => toast.error(error.message),
            onSuccess: () => toast.success("Queue job returned to the pending queue.")
          })
        }
        onRun={(id) =>
          mutations.run.mutate(id, {
            onError: (error) => toast.error(error.message),
            onSuccess: () => toast.success("Queue job started.")
          })
        }
      />
    </WorkspacePage>
  );
}

function emptyQueueFilters(): QueueJobFilters {
  return { correlationId: "", queueName: "", status: "", tenantId: "" };
}

function backendLabel(backend: QueueBackend) {
  if (backend === "memory") return "In-memory";
  if (backend === "bullmq-redis") return "BullMQ + Redis";
  return "Database";
}
