import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import type { AuditEventDTO } from "./tenant.types";

export function TenantActivityControl({
  events,
  loading
}: {
  events: AuditEventDTO[];
  loading: boolean;
}) {
  return (
    <WorkspaceShowCard title="Activity">
      <div className="divide-y divide-border/60">
        {loading ? <GlobalLoader className="min-h-28" fullScreen={false} /> : null}
        {!loading && events.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No activity yet.</p>
        ) : null}
        {events.slice(0, 10).map((event) => (
          <div key={String(event.id)} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {event.event_name.replace(/[._-]+/g, " ")}
              </p>
              <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{event.actor_email || "system"}</p>
          </div>
        ))}
      </div>
    </WorkspaceShowCard>
  );
}

function formatDate(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
