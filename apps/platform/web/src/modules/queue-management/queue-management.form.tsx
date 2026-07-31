import { RefreshCwIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@cxapp/ui/components/button";
import { Input } from "@cxapp/ui/components/input";
import { Label } from "@cxapp/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@cxapp/ui/components/radio-group";
import { StatusBadge } from "@cxapp/ui";
import { WorkspaceSelect } from "@cxapp/ui/workspace/select";
import { queueBackendSchema } from "./queue-management.schema";
import type { QueueBackend, QueueJobFilters, QueueRuntimeSettings } from "./queue-management.types";

export function QueueManagementForm({
  draftBackend,
  filters,
  filtersActive,
  loading,
  settings,
  onBackendChange,
  onCleanup,
  onFiltersChange,
  onResetFilters,
  onRefresh
}: {
  draftBackend: QueueBackend;
  filters: QueueJobFilters;
  filtersActive: boolean;
  loading: boolean;
  settings: QueueRuntimeSettings | undefined;
  onBackendChange: (backend: QueueBackend) => void;
  onCleanup: () => void;
  onFiltersChange: (filters: QueueJobFilters) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Processing backend</p>
            {settings?.updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Last published by {settings.updatedBy} ·{" "}
                {new Date(settings.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <StatusBadge tone={draftBackend === settings?.backend ? "green" : "amber"}>
            {draftBackend === settings?.backend ? "Live" : "Draft not live"}
          </StatusBadge>
        </div>
        <RadioGroup
          aria-label="Queue backend"
          className="mt-3 grid gap-3 md:grid-cols-3"
          value={draftBackend}
          onValueChange={(value) => onBackendChange(queueBackendSchema.parse(value))}
        >
          {backendOptions(settings?.availableBackends).map((option) => {
            const disabled =
              option.value === "bullmq-redis" && Boolean(settings && !settings.redisConfigured);
            const selected = draftBackend === option.value;
            return (
              <Label
                key={option.value}
                aria-disabled={disabled}
                className={`flex min-h-20 items-start gap-3 rounded-md border p-3 transition-colors ${
                  disabled
                    ? "cursor-not-allowed opacity-55"
                    : selected
                      ? "cursor-pointer border-primary/60 bg-primary/5"
                      : "cursor-pointer bg-background hover:bg-muted/35"
                }`}
              >
                <RadioGroupItem className="mt-0.5" disabled={disabled} value={option.value} />
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                    {backendDescription(option.value)}
                  </span>
                </span>
              </Label>
            );
          })}
        </RadioGroup>
        {settings && !settings.redisConfigured ? (
          <p className="mt-2 text-xs text-amber-700">
            Configure CXAPP_REDIS_URL to enable distributed BullMQ processing.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Job filters</p>
          <p className="text-xs text-muted-foreground">
            Narrow the job table without changing data.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <div className="w-40">
            <WorkspaceSelect
              ariaLabel="Queue job status"
              value={filters.status || "all"}
              options={[
                { label: "All status", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Running", value: "running" },
                { label: "Failed", value: "failed" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" }
              ]}
              onValueChange={(status) =>
                onFiltersChange({
                  ...filters,
                  status: status === "all" ? "" : (status as QueueJobFilters["status"])
                })
              }
            />
          </div>
          <Input
            aria-label="Filter by queue"
            className="h-11 w-36"
            placeholder="Queue"
            value={filters.queueName}
            onChange={(event) => onFiltersChange({ ...filters, queueName: event.target.value })}
          />
          <Input
            aria-label="Filter by tenant"
            className="h-11 w-40"
            placeholder="Tenant"
            value={filters.tenantId}
            onChange={(event) => onFiltersChange({ ...filters, tenantId: event.target.value })}
          />
          <Input
            aria-label="Filter by correlation ID"
            className="h-11 w-56"
            placeholder="Correlation ID"
            value={filters.correlationId}
            onChange={(event) => onFiltersChange({ ...filters, correlationId: event.target.value })}
          />
          <Button disabled={loading} variant="outline" onClick={onCleanup}>
            <Trash2Icon className="size-4" />
            Clean history
          </Button>
          <Button disabled={loading || !filtersActive} variant="outline" onClick={onResetFilters}>
            <RotateCcwIcon className="size-4" />
            Reset filters
          </Button>
          <Button disabled={loading} variant="outline" onClick={onRefresh}>
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}

function backendOptions(availableBackends: QueueBackend[] | undefined) {
  const available = availableBackends ?? ["database", "bullmq-redis"];
  return available.map((backend) => ({ label: backendLabel(backend), value: backend }));
}

function backendLabel(backend: QueueBackend) {
  if (backend === "bullmq-redis") return "BullMQ + Redis";
  return "Database";
}

function backendDescription(backend: QueueBackend) {
  if (backend === "bullmq-redis")
    return "Distributed workers with Redis-backed delivery and retries.";
  return "Durable processing from the platform database; recommended for one runtime.";
}
