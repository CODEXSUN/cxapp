import { GlobalLoader, StatusBadge } from "@codexsun/ui";
import { AppOrchestrationForm } from "./app-orchestration.form";
import { useAppOperationsQuery } from "./app-orchestration.hooks";
import { appOperationTones, AppServiceList } from "./app-orchestration.list";
import type { OrchestratedAppId } from "./app-orchestration.types";
export function AppOrchestrationWorkspace({
  appId,
  onBack
}: {
  appId: OrchestratedAppId;
  onBack: () => void;
}) {
  const query = useAppOperationsQuery();
  const app = query.data?.find((item) => item.id === appId);
  if (query.isLoading) {
    return <GlobalLoader className="min-h-[24rem]" fullScreen={false} />;
  }

  if (!app)
    return (
      <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] py-5">
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          App operations could not be found.
        </div>
      </main>
    );
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-5 lg:w-[calc(100%-3rem)]">
      <section
        className={`relative overflow-hidden rounded-lg border bg-gradient-to-br p-6 shadow-sm ${appOperationTones[app.id].card}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-14 size-44 rounded-full bg-white/80 blur-3xl dark:bg-white/15"
        />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              className="mb-3 text-sm text-muted-foreground hover:text-foreground"
              onClick={onBack}
            >
              ← Back to apps
            </button>
            <h1 className="text-3xl font-semibold">{app.label} Operations</h1>
            <p className="mt-2 text-sm text-muted-foreground">{app.description}</p>
          </div>
          <StatusBadge
            tone={app.status === "online" ? "green" : app.status === "partial" ? "amber" : "red"}
          >
            {app.status}
          </StatusBadge>
        </div>
        <div className="relative z-10 mt-5">
          <AppOrchestrationForm busy={query.isFetching} onRefresh={() => void query.refetch()} />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          tone={appOperationTones[app.id].metric}
          label="Services online"
          value={`${app.services.filter((item) => item.online).length}/${app.services.length}`}
        />
        <Metric
          tone={appOperationTones[app.id].metric}
          label="Average response"
          value={average(app)}
        />
        <Metric
          tone={appOperationTones[app.id].metric}
          label="Managed uptime"
          value={app.uptimeSeconds === null ? "External" : formatDuration(app.uptimeSeconds)}
        />
        <Metric
          tone={appOperationTones[app.id].metric}
          label="Terminal PID"
          value={app.terminalPid === null ? "—" : String(app.terminalPid)}
        />
      </div>
      <AppServiceList app={app} />
      <section className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
        Platform is the only runtime. Core, Billing, Mail, Framework, and UI are composed workspace
        packages and do not own standalone processes or ports.
      </section>
    </main>
  );
}
function Metric({ label, tone, value }: { label: string; tone: string; value: string }) {
  return (
    <div className={`min-h-28 rounded-lg border bg-gradient-to-br p-5 shadow-sm ${tone}`}>
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}
function average(app: { services: Array<{ responseMs: number | null }> }) {
  const values = app.services.flatMap((item) =>
    item.responseMs === null ? [] : [item.responseMs]
  );
  return values.length
    ? `${Math.round(values.reduce((a, b) => a + b, 0) / values.length)} ms`
    : "—";
}
function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
