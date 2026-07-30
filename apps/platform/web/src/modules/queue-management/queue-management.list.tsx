import { formatDistanceToNow } from "date-fns";
import {
  BanIcon,
  CheckCircle2Icon,
  Clock3Icon,
  Layers3Icon,
  PlayIcon,
  RotateCcwIcon,
  TriangleAlertIcon
} from "lucide-react";
import { StatusBadge } from "@codexsun/ui";
import { Button } from "@codexsun/ui/components/button";
import type { QueueJobRecord, QueueRuntimeSettings } from "./queue-management.types";

export function QueueManagementList({
  busy,
  jobs,
  settings,
  onCancel,
  onRetry,
  onRun
}: {
  busy: boolean;
  jobs: QueueJobRecord[];
  settings: QueueRuntimeSettings | undefined;
  onCancel: (id: number) => void;
  onRetry: (id: number) => void;
  onRun: (id: number) => void;
}) {
  const pending = settings?.pending ?? jobs.filter((job) => job.status === "pending").length;
  const running = settings?.running ?? jobs.filter((job) => job.status === "running").length;
  const failed = settings?.failed ?? jobs.filter((job) => job.status === "failed").length;
  const completed = settings?.completed ?? jobs.filter((job) => job.status === "completed").length;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard
          icon={Layers3Icon}
          label="Backend"
          value={settings?.backendLabel ?? "Database queue"}
        />
        <MetricCard icon={Clock3Icon} label="Pending" value={String(pending)} />
        <MetricCard icon={PlayIcon} label="Running" value={String(running)} />
        <MetricCard
          icon={TriangleAlertIcon}
          label="Failed"
          value={String(failed)}
          {...(failed > 0 ? { tone: "red" as const } : {})}
        />
        <MetricCard
          icon={CheckCircle2Icon}
          label="Completed"
          value={String(completed)}
          tone="green"
        />
      </div>
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <WorkflowStep active={pending > 0} count={pending} label="Queued" />
          <WorkflowStep active={running > 0} count={running} label="Processing" />
          <WorkflowStep
            active={failed > 0}
            count={failed}
            label="Needs review"
            {...(failed > 0 ? { tone: "red" as const } : {})}
          />
          <WorkflowStep active={completed > 0} count={completed} label="Finished" tone="green" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <table className="w-full min-w-[1120px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Job</th>
              <th className="px-4 py-3 text-left font-semibold">Queue</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Attempts</th>
              <th className="px-4 py-3 text-left font-semibold">Tenant</th>
              <th className="px-4 py-3 text-left font-semibold">Correlation</th>
              <th className="px-4 py-3 text-left font-semibold">Updated</th>
              <th className="px-4 py-3 text-right font-semibold">Controls</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr className="border-t align-top" key={job.uuid}>
                <td className="px-4 py-3">
                  <div className="font-medium">{job.jobName}</div>
                  <div className="text-muted-foreground">{job.sourceModule}</div>
                  {job.errorMessage ? (
                    <div className="mt-1 text-xs text-destructive">{job.errorMessage}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">{job.queueName}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={statusTone(job.status)}>{job.status}</StatusBadge>
                </td>
                <td className="px-4 py-3">
                  {job.attempts}/{job.maxAttempts}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{job.tenantId ?? "platform"}</td>
                <td className="px-4 py-3 text-muted-foreground">{job.correlationId ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      disabled={busy || (job.status !== "pending" && job.status !== "failed")}
                      size="sm"
                      onClick={() => onRun(job.id)}
                    >
                      <PlayIcon className="size-4" />
                      Run
                    </Button>
                    <Button
                      disabled={busy || (job.status !== "failed" && job.status !== "cancelled")}
                      size="sm"
                      variant="outline"
                      onClick={() => onRetry(job.id)}
                    >
                      <RotateCcwIcon className="size-4" />
                      Retry
                    </Button>
                    <Button
                      disabled={busy || (job.status !== "pending" && job.status !== "failed")}
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel(job.id)}
                    >
                      <BanIcon className="size-4" />
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {jobs.map((job) => (
              <tr className="border-t bg-muted/20 align-top" key={`${job.uuid}-details`}>
                <td className="px-4 py-3 text-xs text-muted-foreground" colSpan={8}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <pre className="max-h-28 overflow-auto rounded-md border bg-background p-3">
                      <span className="mb-2 block font-medium text-foreground">Payload</span>
                      {JSON.stringify(maskDetails(job.payload), null, 2)}
                    </pre>
                    <pre className="max-h-28 overflow-auto rounded-md border bg-background p-3">
                      <span className="mb-2 block font-medium text-foreground">Result</span>
                      {JSON.stringify(maskDetails(job.result), null, 2)}
                    </pre>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No queue jobs found.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function maskDetails(value: Record<string, unknown>) {
  const masked: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    masked[key] = /password|secret|token|key/i.test(key) ? "***" : entry;
  }
  return masked;
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: typeof Layers3Icon;
  label: string;
  tone?: "green" | "red" | undefined;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <Icon className="size-5 text-muted-foreground" />
      <div className="mt-5 text-xl font-semibold">
        {tone ? <StatusBadge tone={tone}>{value}</StatusBadge> : value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function WorkflowStep({
  active,
  count,
  label,
  tone
}: {
  active: boolean;
  count: number;
  label: string;
  tone?: "green" | "red" | undefined;
}) {
  return (
    <div className={`rounded-md border px-4 py-3 ${active ? "bg-muted/40" : "bg-background"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <StatusBadge tone={tone ?? (active ? "blue" : "neutral")} children={String(count)} />
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full ${tone === "red" ? "bg-destructive" : tone === "green" ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: active ? "100%" : "18%" }}
        />
      </div>
    </div>
  );
}

function statusTone(status: QueueJobRecord["status"]) {
  if (status === "completed") return "green";
  if (status === "failed" || status === "cancelled") return "red";
  return "blue";
}
