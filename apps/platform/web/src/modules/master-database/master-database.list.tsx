import { formatDistanceToNow } from "date-fns";
import { DatabaseIcon, RotateCcwIcon, ServerIcon, ShieldCheckIcon } from "lucide-react";
import { GlobalLoader, StatusBadge } from "@codexsun/ui";
import type { MasterDatabaseStatus } from "./master-database.types";

export function MasterDatabaseList({ record }: { record: MasterDatabaseStatus | undefined }) {
  if (!record) {
    return <GlobalLoader className="min-h-[24rem]" fullScreen={false} />;
  }
  const lastRun = record.runs[0];
  const pendingRuns = record.runs.filter(
    (run) => run.status === "requested" || run.status === "running"
  ).length;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={ShieldCheckIcon}
          label="Live status"
          value={record.status}
          tone={record.status === "online" ? "green" : "red"}
        />
        <MetricCard icon={DatabaseIcon} label="Version" value={record.version} />
        <MetricCard icon={ServerIcon} label="Tables" value={String(record.tableCount)} />
        <MetricCard
          icon={RotateCcwIcon}
          label="Migrations"
          value={String(record.migrations.length)}
        />
      </div>
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <WorkflowStep
            active
            label="Connected"
            tone={record.status === "online" ? "green" : "red"}
            value={record.status}
          />
          <WorkflowStep
            active={record.migrations.length > 0}
            label="Migrated"
            value={String(record.migrations.length)}
          />
          <WorkflowStep
            active={pendingRuns > 0}
            label="Queued"
            value={String(pendingRuns)}
            tone={pendingRuns > 0 ? "blue" : "neutral"}
          />
          <WorkflowStep
            active={Boolean(lastRun)}
            label="Last run"
            value={lastRun ? lastRun.status : "none"}
            tone={
              lastRun?.status === "completed"
                ? "green"
                : lastRun?.status === "failed"
                  ? "red"
                  : "neutral"
            }
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-md border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ServerIcon className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold tracking-normal">Master Connection</h2>
              <p className="text-sm text-muted-foreground">
                {record.host}:{record.port}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 text-sm">
            <InfoRow label="Database" value={record.databaseName} />
            <InfoRow label="Backup" value={record.backupStatus} />
            <InfoRow label="Restore" value={record.restoreStatus} />
            <InfoRow
              label="Recent run"
              value={lastRun ? `${lastRun.operation} ${lastRun.status}` : "none"}
            />
          </dl>
        </div>
        <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Migration</th>
                <th className="px-4 py-3 text-left font-semibold">Applied</th>
              </tr>
            </thead>
            <tbody>
              {record.migrations.map((migration) => (
                <tr className="border-t" key={migration.name}>
                  <td className="px-4 py-3 font-medium">{migration.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(new Date(migration.appliedAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {record.migrations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No migration rows found.
            </div>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Operation</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Database</th>
              <th className="px-4 py-3 text-left font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {record.runs.map((run) => (
              <tr className="border-t" key={run.uuid}>
                <td className="px-4 py-3 font-medium">{run.operation}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={
                      run.status === "completed"
                        ? "green"
                        : run.status === "failed"
                          ? "red"
                          : "blue"
                    }
                  >
                    {run.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{run.databaseName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {record.runs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No maintenance runs recorded.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: typeof DatabaseIcon;
  label: string;
  tone?: "green" | "red";
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <Icon className="size-5 text-muted-foreground" />
      <div className="mt-5 flex items-center gap-2 text-xl font-semibold">
        {tone ? <StatusBadge tone={tone}>{value}</StatusBadge> : value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function WorkflowStep({
  active,
  label,
  tone,
  value
}: {
  active: boolean;
  label: string;
  tone?: "blue" | "green" | "neutral" | "red";
  value: string;
}) {
  return (
    <div className={`rounded-md border px-4 py-3 ${active ? "bg-muted/40" : "bg-background"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <StatusBadge tone={tone ?? (active ? "blue" : "neutral")}>{value}</StatusBadge>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
