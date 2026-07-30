import { DatabaseMaintenanceRepository } from "./database-maintenance.repository.js";
import { env } from "../../env.js";
import { executeDatabaseBackup, executeDatabaseRestore } from "./database-maintenance.executor.js";
import { resolveTenantDatabasePassword } from "../../database/tenant-database.js";

export async function processDatabaseMaintenanceJob(payload: Record<string, unknown>) {
  const runId = Number(payload.runId);
  if (!Number.isInteger(runId) || runId <= 0) {
    throw new Error("Database maintenance job requires a valid runId.");
  }

  const repository = new DatabaseMaintenanceRepository();
  const run = await repository.findRun(runId);
  if (!run) {
    throw new Error("Database maintenance run was not found.");
  }

  const executedAt = new Date().toISOString();
  const tenant = run.scope === "tenant" ? await repository.findTenant(Number(run.targetKey)) : null;
  const target = {
    databaseName: run.databaseName,
    host: stringDetail(run.details.host) || env.DB_HOST,
    password: tenant ? resolveTenantDatabasePassword(tenant) : env.DB_PASSWORD,
    port: numberDetail(run.details.port) || env.DB_PORT,
    tenantKey: stringDetail(run.details.tenantKey) || stringDetail(run.details.tenantCode),
    user: stringDetail(run.details.user) || env.DB_USER
  };

  const result =
    run.operation === "restore"
      ? await executeDatabaseRestore({
          backupPath: await restoreBackupPath(repository, run),
          liveRestoreConfirm: stringDetail(run.details.liveRestoreConfirm),
          operation: run.operation,
          restoreMode: stringDetail(run.details.restoreMode),
          runId: run.id,
          scope: run.scope,
          target
        })
      : await executeDatabaseBackup({
          operation: run.operation,
          runId: run.id,
          scope: run.scope,
          target
        });

  const details = {
    ...run.details,
    executedAt,
    ...result,
    queueStatus: "completed"
  };
  await repository.updateRunStatus(run.id, "completed", details);

  return {
    databaseName: run.databaseName,
    operation: run.operation,
    runId: run.id,
    scope: run.scope,
    ...result
  };
}

async function restoreBackupPath(
  repository: DatabaseMaintenanceRepository,
  run: NonNullable<Awaited<ReturnType<DatabaseMaintenanceRepository["findRun"]>>>
) {
  const explicitPath = stringDetail(run.details.backupPath) || stringDetail(run.details.filePath);
  if (explicitPath) return explicitPath;
  const backupId = stringDetail(run.details.backupId);
  const latest = await repository.latestCompletedBackup(run.scope, run.targetKey);
  if (!latest) {
    throw new Error(
      backupId
        ? `Backup ${backupId} was not found for restore.`
        : "No completed backup is available for restore."
    );
  }
  const latestBackupId = stringDetail(latest.details.backupId);
  if (backupId && latestBackupId !== backupId) {
    throw new Error(`Backup ${backupId} was not found for this target.`);
  }
  const latestPath = stringDetail(latest.details.filePath);
  if (!latestPath) {
    throw new Error("Latest completed backup has no file path.");
  }
  return latestPath;
}

function stringDetail(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberDetail(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
