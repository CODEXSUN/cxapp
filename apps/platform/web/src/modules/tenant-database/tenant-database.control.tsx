import { useState } from "react";
import {
  DatabaseIcon,
  DownloadIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  UploadIcon,
  WrenchIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@codexsun/ui/components/alert-dialog";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { WorkspaceDetailTable, WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { useTenantDatabaseDetailsQuery, useTenantDatabaseMutations } from "./tenant-database.hooks";

export function TenantDatabaseControl({ tenantId }: { tenantId: number }) {
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const details = useTenantDatabaseDetailsQuery(tenantId);
  const mutations = useTenantDatabaseMutations();
  const busy = Object.values(mutations).some((mutation) => mutation.isPending);
  const database = details.data;

  const runSetup = () => {
    mutations.setup.mutate(tenantId, {
      onError: (error) => showError("Database setup failed", error),
      onSuccess: () => {
        toast.success("Tenant database is ready");
        void details.refetch();
      }
    });
  };

  const runReinstall = () => {
    setConfirmReinstall(false);
    mutations.reinstall.mutate(tenantId, {
      onError: (error) => showError("Database re-install failed", error),
      onSuccess: () => {
        toast.success("Tenant database was repaired and reseeded");
        void details.refetch();
      }
    });
  };

  const runMaintenance = (operation: "backup" | "migrate" | "restore") => {
    const mutation = mutations[operation];
    mutation.mutate(tenantId, {
      onError: (error) => showError(`Database ${operation} failed`, error),
      onSuccess: () => {
        setConfirmRestore(false);
        toast.success(
          operation === "restore"
            ? "Sandbox restore requested"
            : operation === "backup"
              ? "Database backup requested"
              : "Tenant migrations applied"
        );
        void details.refetch();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <DatabaseIcon className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Tenant database connection</p>
            <p className="text-xs text-muted-foreground">
              Live status is verified directly against the configured database server.
            </p>
          </div>
          {database ? (
            <WorkspaceStatusBadge
              label={database.status === "online" ? "Live" : "Offline"}
              tone={database.status === "online" ? "success" : "danger"}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={details.isFetching || busy}
            onClick={() => void details.refetch()}
          >
            <RefreshCwIcon className={`size-4 ${details.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" disabled={busy} onClick={runSetup}>
            <WrenchIcon className="size-4" />
            New setup
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirmReinstall(true)}
          >
            <RotateCcwIcon className="size-4" />
            Re-install
          </Button>
        </div>
      </div>

      {details.isLoading && !database ? (
        <GlobalLoader className="min-h-40" fullScreen={false} />
      ) : null}
      {details.isError ? (
        <WorkspaceShowCard title="Database unavailable">
          <p className="px-4 py-3 text-sm text-destructive">
            {details.error instanceof Error ? details.error.message : "Could not inspect database."}
          </p>
        </WorkspaceShowCard>
      ) : null}
      {database ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <WorkspaceShowCard title="Live connection">
            <WorkspaceDetailTable
              rows={[
                ["Status", database.status === "online" ? "Live connected" : "Offline"],
                ["Database", database.databaseName],
                ["Host", database.host],
                ["Port", database.port],
                ["Server version", database.version],
                ["Tables", database.tableCount]
              ]}
            />
          </WorkspaceShowCard>
          <WorkspaceShowCard title="Setup state">
            <WorkspaceDetailTable
              rows={[
                ["Applied migrations", database.migrations.length],
                ["Pending migrations", database.migrationPlan.pending.length],
                ["Latest migration", database.migrationPlan.latestApplied?.name ?? "None"],
                ["Maintenance runs", database.runs.length],
                ["Last operation", database.runs[0]?.operation ?? "None"],
                ["Last result", database.runs[0]?.status ?? "None"]
              ]}
            />
          </WorkspaceShowCard>
          <WorkspaceShowCard title="Maintenance controls">
            <div className="flex flex-wrap gap-2 p-4">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => runMaintenance("migrate")}
              >
                <WrenchIcon className="size-4" />
                Safe migrate
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => runMaintenance("backup")}
              >
                <DownloadIcon className="size-4" />
                Backup
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmRestore(true)}
              >
                <UploadIcon className="size-4" />
                Restore sandbox
              </Button>
            </div>
          </WorkspaceShowCard>
          <WorkspaceShowCard title="Recent database runs">
            <div className="divide-y divide-border/60">
              {database.runs.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No maintenance runs yet.</p>
              ) : null}
              {database.runs.slice(0, 5).map((run) => (
                <div className="flex items-center justify-between gap-3 px-4 py-3" key={run.id}>
                  <div>
                    <p className="text-sm font-medium capitalize">{run.operation}</p>
                    <p className="text-xs text-muted-foreground">{run.createdAt}</p>
                  </div>
                  <WorkspaceStatusBadge
                    label={run.status}
                    tone={
                      run.status === "completed"
                        ? "success"
                        : run.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  />
                </div>
              ))}
            </div>
          </WorkspaceShowCard>
        </div>
      ) : null}

      <AlertDialog open={confirmReinstall} onOpenChange={setConfirmReinstall}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-install tenant database?</AlertDialogTitle>
            <AlertDialogDescription>
              This safely reapplies tenant migrations and repeatable seeds. Existing business
              records are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runReinstall}>Re-install</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore the latest backup to a sandbox?</AlertDialogTitle>
            <AlertDialogDescription>
              The live tenant database will not be overwritten. The queued restore uses the
              configured sandbox target.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => runMaintenance("restore")}>
              Request sandbox restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function showError(title: string, error: unknown) {
  toast.error(title, {
    description:
      error instanceof Error ? error.message : "The database operation could not complete."
  });
}
