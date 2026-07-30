import { formatDistanceToNow } from "date-fns";
import { Building2Icon, CheckCircle2Icon, Clock3Icon, DatabaseIcon } from "lucide-react";
import { GlobalLoader, StatusBadge } from "@codexsun/ui";
import type { TenantDatabaseStatus } from "./tenant-database.types";

export function TenantDatabaseList({
  loading,
  records,
  onView
}: {
  loading: boolean;
  records: TenantDatabaseStatus[];
  onView: (record: TenantDatabaseStatus) => void;
}) {
  const online = records.filter((record) => record.status === "online").length;
  const pending = records
    .flatMap((record) => record.runs)
    .filter((run) => run.status === "requested" || run.status === "running").length;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Building2Icon} label="Tenant databases" value={String(records.length)} />
        <MetricCard
          icon={CheckCircle2Icon}
          label="Online"
          value={String(online)}
          {...(online === records.length ? { tone: "green" as const } : {})}
        />
        <MetricCard
          icon={Clock3Icon}
          label="Pending runs"
          value={String(pending)}
          {...(pending > 0 ? { tone: "blue" as const } : {})}
        />
      </div>
      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Tenant</th>
              <th className="px-4 py-3 text-left font-semibold">Database</th>
              <th className="px-4 py-3 text-left font-semibold">Live</th>
              <th className="px-4 py-3 text-left font-semibold">Version</th>
              <th className="px-4 py-3 text-left font-semibold">Tables</th>
              <th className="px-4 py-3 text-left font-semibold">Last run</th>
              <th className="px-4 py-3 text-right font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const lastRun = record.runs[0];
              return (
                <tr className="border-t align-top" key={record.tenantId}>
                  <td className="px-4 py-3">
                    <button
                      className="max-w-72 truncate font-medium hover:underline"
                      type="button"
                      onClick={() => onView(record)}
                    >
                      {record.tenantName}
                    </button>
                    <div className="text-muted-foreground">{record.tenantCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{record.databaseName}</div>
                    <div className="text-muted-foreground">
                      {record.host}:{record.port}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={record.status === "online" ? "green" : "red"}>
                      {record.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{record.version}</td>
                  <td className="px-4 py-3">{record.tableCount}</td>
                  <td className="px-4 py-3">
                    {lastRun ? (
                      <>
                        <div className="flex items-center gap-2 font-medium">
                          <span>{lastRun.operation}</span>
                          <StatusBadge
                            tone={
                              lastRun.status === "completed"
                                ? "green"
                                : lastRun.status === "failed"
                                  ? "red"
                                  : "blue"
                            }
                          >
                            {lastRun.status}
                          </StatusBadge>
                        </div>
                        <div className="text-muted-foreground">
                          {formatDistanceToNow(new Date(lastRun.createdAt), { addSuffix: true })}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No runs</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-sm font-medium text-primary hover:underline"
                      type="button"
                      onClick={() => onView(record)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {records.length === 0 && loading ? (
          <GlobalLoader className="min-h-32" fullScreen={false} />
        ) : null}
        {records.length === 0 && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No tenant databases found.
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
  tone?: "blue" | "green" | undefined;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <Icon className="size-5 text-muted-foreground" />
      <div className="mt-5 text-2xl font-semibold">
        {tone ? <StatusBadge tone={tone}>{value}</StatusBadge> : value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
