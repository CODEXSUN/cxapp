import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  DownloadIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  UploadIcon
} from "lucide-react";
import { GlobalLoader, StatusBadge } from "@codexsun/ui";
import { Button } from "@codexsun/ui/components/button";
import {
  WorkspaceAnimatedTabs,
  type WorkspaceAnimatedTab
} from "@codexsun/ui/workspace/animated-tabs";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import {
  WorkspaceDetailTable,
  WorkspaceShowCard,
  WorkspaceShowLayout
} from "@codexsun/ui/workspace/show";
import type {
  DatabaseMaintenanceRun,
  DatabaseMigrationPlan,
  DatabaseTableInfo,
  TenantDatabaseDetails,
  TenantDatabaseStatus
} from "./tenant-database.types";

export function TenantDatabaseShowPage({
  busy,
  details,
  loading,
  record,
  onBack,
  onBackup,
  onMigrate,
  onRefresh,
  onRestore
}: {
  busy: boolean;
  details: TenantDatabaseDetails | undefined;
  loading: boolean;
  record: TenantDatabaseStatus;
  onBack: () => void;
  onBackup: () => void;
  onMigrate: () => void;
  onRefresh: () => void;
  onRestore: () => void;
}) {
  const [activeTab, setActiveTab] = useState("details");
  const latestRun = record.runs[0];
  const tables = details?.tables ?? [];
  const migrationPlan = details?.migrationPlan;
  const tabs: WorkspaceAnimatedTab[] = [
    {
      label: "Details",
      value: "details",
      content: (
        <WorkspaceShowLayout>
          <WorkspaceShowCard title="Database profile">
            <WorkspaceDetailTable
              rows={[
                ["Tenant", record.tenantName],
                [
                  "Tenant code",
                  <span key="tenant-code" className="font-mono text-xs">
                    {record.tenantCode}
                  </span>
                ],
                ["Tenant ID", record.tenantId],
                [
                  "Database",
                  <span key="database" className="font-mono text-xs">
                    {record.databaseName}
                  </span>
                ],
                [
                  "Status",
                  <StatusBadge key="status" tone={record.status === "online" ? "green" : "red"}>
                    {record.status}
                  </StatusBadge>
                ],
                ["Version", record.version],
                ["Table count", details?.tables.length ?? record.tableCount],
                [
                  "Rows",
                  details
                    ? details.tables.reduce((sum, table) => sum + table.recordCount, 0)
                    : "Loading"
                ],
                ["Migrations", record.migrations.length],
                ["Maintenance runs", record.runs.length]
              ]}
            />
          </WorkspaceShowCard>

          <WorkspaceShowCard title="Connection">
            <WorkspaceDetailTable
              rows={[
                [
                  "Host",
                  <span key="host" className="font-mono text-xs">
                    {record.host}
                  </span>
                ],
                ["Port", record.port],
                [
                  "Endpoint",
                  <span key="endpoint" className="font-mono text-xs">
                    {record.host}:{record.port}
                  </span>
                ],
                ["Last operation", latestRun ? latestRun.operation : "No runs"],
                [
                  "Last status",
                  latestRun ? (
                    <StatusBadge key="last-status" tone={runTone(latestRun.status)}>
                      {latestRun.status}
                    </StatusBadge>
                  ) : (
                    "No runs"
                  )
                ],
                ["Last updated", latestRun ? formatDate(latestRun.createdAt) : "No runs"]
              ]}
            />
          </WorkspaceShowCard>
        </WorkspaceShowLayout>
      )
    },
    {
      label: "Tables",
      value: "tables",
      content: <TablesCard loading={loading && !details} tables={tables} />
    },
    {
      label: "Migrations",
      value: "migrations",
      content: <MigrationPlanCard migrations={record.migrations} plan={migrationPlan} />
    },
    {
      label: "Dry Run",
      value: "dry-run",
      content: (
        <DryRunCard
          loading={loading && !details}
          plan={migrationPlan}
          onVerifySnapshot={onRefresh}
        />
      )
    },
    {
      label: "Runs",
      value: "runs",
      content: <MaintenanceRunsCard busy={busy} runs={record.runs} onMigrate={onMigrate} />
    }
  ];

  return (
    <WorkspacePage
      title={record.tenantName}
      description="Review full tenant database status, connection, migrations, and maintenance history."
      technicalName="page.database.tenant.show"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-md" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <Button
            disabled={loading}
            type="button"
            variant="outline"
            className="h-9 rounded-md"
            onClick={onRefresh}
          >
            <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            disabled={busy}
            type="button"
            variant="outline"
            className="h-9 rounded-md"
            onClick={onBackup}
          >
            <DownloadIcon className="size-4" />
            Backup
          </Button>
          <Button
            disabled={busy}
            type="button"
            variant="outline"
            className="h-9 rounded-md"
            onClick={onRestore}
          >
            <UploadIcon className="size-4" />
            Restore
          </Button>
        </div>
      }
    >
      <WorkspaceAnimatedTabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
    </WorkspacePage>
  );
}

function TablesCard({ loading, tables }: { loading: boolean; tables: DatabaseTableInfo[] }) {
  return (
    <WorkspaceShowCard title="Tables">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Table</th>
              <th className="px-4 py-3 text-left font-semibold">Rows</th>
              <th className="px-4 py-3 text-left font-semibold">Data</th>
              <th className="px-4 py-3 text-left font-semibold">Index</th>
              <th className="px-4 py-3 text-left font-semibold">Auto</th>
              <th className="px-4 py-3 text-left font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr className="border-t" key={table.name}>
                <td className="px-4 py-3 font-mono text-xs">{table.name}</td>
                <td className="px-4 py-3 tabular-nums">{table.recordCount}</td>
                <td className="px-4 py-3 tabular-nums">{formatBytes(table.dataBytes)}</td>
                <td className="px-4 py-3 tabular-nums">{formatBytes(table.indexBytes)}</td>
                <td className="px-4 py-3 tabular-nums">{table.autoIncrement ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {table.updatedAt ? formatDate(table.updatedAt) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? <GlobalLoader className="min-h-28" fullScreen={false} /> : null}
        {!loading && tables.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No table details found.</div>
        ) : null}
      </div>
    </WorkspaceShowCard>
  );
}

function MigrationPlanCard({
  migrations,
  plan
}: {
  migrations: TenantDatabaseStatus["migrations"];
  plan: DatabaseMigrationPlan | undefined;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <WorkspaceShowCard title="Migration history">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Migration</th>
                <th className="px-4 py-3 text-left font-semibold">Applied</th>
              </tr>
            </thead>
            <tbody>
              {migrations.map((migration) => (
                <tr className="border-t" key={`${migration.name}-${migration.appliedAt}`}>
                  <td className="px-4 py-3 font-mono text-xs">{migration.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(migration.appliedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {migrations.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No migration rows found.</div>
          ) : null}
        </div>
      </WorkspaceShowCard>
      <WorkspaceShowCard title="Migration status">
        <WorkspaceDetailTable
          rows={[
            ["Available", plan?.available.length ?? "Loading"],
            ["Applied", plan?.applied.length ?? migrations.length],
            ["Pending", plan?.pending.length ?? "Loading"],
            ["Latest applied", plan?.latestApplied ? plan.latestApplied.name : "None"],
            ["Latest pending", plan?.latestPending ? plan.latestPending.name : "None"]
          ]}
        />
      </WorkspaceShowCard>
    </div>
  );
}

function DryRunCard({
  loading,
  onVerifySnapshot,
  plan
}: {
  loading: boolean;
  onVerifySnapshot: () => void;
  plan: DatabaseMigrationPlan | undefined;
}) {
  const script = plan?.dryRunScript ?? [];
  return (
    <WorkspaceShowCard title="Dry run script">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Snapshot verification</p>
          <p className="text-xs text-muted-foreground">
            Refresh the live database snapshot before comparing pending migration steps.
          </p>
        </div>
        <Button
          disabled={loading}
          type="button"
          variant="outline"
          className="h-9 rounded-md"
          onClick={onVerifySnapshot}
        >
          <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Verify snapshot
        </Button>
      </div>
      {loading ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">Preparing dry run...</div>
      ) : null}
      {!loading && script.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          No pending tenant migration steps.
        </div>
      ) : null}
      {script.length > 0 ? (
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap p-4 text-xs leading-6">
          {script.join("\n")}
        </pre>
      ) : null}
    </WorkspaceShowCard>
  );
}

function MaintenanceRunsCard({
  busy,
  onMigrate,
  runs
}: {
  busy: boolean;
  onMigrate: () => void;
  runs: DatabaseMaintenanceRun[];
}) {
  return (
    <WorkspaceShowCard title="Maintenance runs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Safe migration</p>
          <p className="text-xs text-muted-foreground">
            Run the tenant migration through the managed database maintenance path.
          </p>
        </div>
        <Button disabled={busy} type="button" className="h-9 rounded-md" onClick={onMigrate}>
          <RotateCcwIcon className="size-4" />
          Safe migrate
        </Button>
      </div>
      <div className="divide-y divide-border/60">
        {runs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No maintenance runs found.</div>
        ) : null}
        {runs.map((run) => (
          <div className="space-y-3 px-4 py-3" key={run.uuid}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{run.operation}</div>
                <div className="font-mono text-xs text-muted-foreground">{run.uuid}</div>
              </div>
              <StatusBadge tone={runTone(run.status)}>{run.status}</StatusBadge>
            </div>
            <WorkspaceDetailTable
              rows={[
                [
                  "Database",
                  <span key="database" className="font-mono text-xs">
                    {run.databaseName}
                  </span>
                ],
                [
                  "Target",
                  <span key="target" className="font-mono text-xs">
                    {run.targetKey}
                  </span>
                ],
                ["Scope", run.scope],
                ["Created", formatDate(run.createdAt)],
                ["Completed", run.completedAt ? formatDate(run.completedAt) : "Not completed"],
                [
                  "Details",
                  <pre
                    key="details"
                    className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs"
                  >
                    {JSON.stringify(maskDetails(run.details), null, 2)}
                  </pre>
                ]
              ]}
            />
          </div>
        ))}
      </div>
    </WorkspaceShowCard>
  );
}

function maskDetails(value: Record<string, unknown>) {
  const masked: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    masked[key] = /password|secret|token|key/i.test(key) ? "***" : entry;
  }
  return masked;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function runTone(status: DatabaseMaintenanceRun["status"]) {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  return "blue";
}
