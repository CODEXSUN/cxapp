import {
  createMasterDatabase,
  migratePlatformDatabase,
  platformDatabaseName
} from "../../database/platform-database.js";
import { provisionTenantDatabase } from "../tenant/index.js";
import { PlatformActivityService } from "../platform-activity/index.js";
import { QueueManagerService } from "../queue-manager/index.js";
import { env } from "../../env.js";
import { DatabaseMaintenanceRepository } from "./database-maintenance.repository.js";
import type { DatabaseActionPayload } from "./database-maintenance.types.js";

export class DatabaseMaintenanceService {
  constructor(
    private readonly repository = new DatabaseMaintenanceRepository(),
    private readonly activity = new PlatformActivityService(),
    private readonly queue = new QueueManagerService()
  ) {}

  masterStatus() {
    return this.repository.masterStatus();
  }

  tenantStatuses() {
    return this.repository.tenantStatuses();
  }

  tenantDetails(tenantId: number) {
    return this.repository.tenantDetails(tenantId);
  }

  setupTenant(tenantId: number, input: DatabaseActionPayload = {}) {
    return this.installTenantDatabase(tenantId, "setup", input);
  }

  reinstallTenant(tenantId: number, input: DatabaseActionPayload = {}) {
    return this.installTenantDatabase(tenantId, "reinstall", input);
  }

  async migrateMaster(input: DatabaseActionPayload = {}) {
    const started = await this.repository.recordRun({
      databaseName: platformDatabaseName(),
      details: input,
      operation: "migrate",
      scope: "master",
      status: "running",
      targetKey: "master"
    });
    try {
      await createMasterDatabase();
      await migratePlatformDatabase();
      const run = await this.repository.updateRunStatus(started.id, "completed", input);
      await this.activity.recordActivity({
        action: "database.master.migrated",
        details: input,
        moduleKey: "platform.database-maintenance",
        recordLabel: platformDatabaseName()
      });
      return run;
    } catch (error) {
      await this.repository.updateRunStatus(started.id, "failed", {
        ...input,
        error: errorMessage(error, "Master database migration failed.")
      });
      throw error;
    }
  }

  async migrateTenant(tenantId: number, input: DatabaseActionPayload = {}) {
    const tenant = await this.repository.findTenant(tenantId);
    if (!tenant) return null;
    return this.runTenantProvisioning(tenant, "migrate", input);
  }

  async requestMasterBackup(input: DatabaseActionPayload = {}) {
    const run = await this.repository.recordRun({
      databaseName: platformDatabaseName(),
      details: {
        ...input,
        host: env.DB_HOST,
        policy: "operator-backup-required",
        port: env.DB_PORT,
        user: env.DB_USER
      },
      operation: "backup",
      scope: "master",
      status: "requested",
      targetKey: "master"
    });
    if (run) await this.enqueueMaintenanceRun(run.id, "master", null);
    await this.activity.recordActivity({
      action: "database.master.backup-requested",
      details: input,
      moduleKey: "platform.database-maintenance",
      recordLabel: platformDatabaseName()
    });
    return run;
  }

  private async installTenantDatabase(
    tenantId: number,
    operation: "reinstall" | "setup",
    input: DatabaseActionPayload
  ) {
    const tenant = await this.repository.findTenant(tenantId);
    if (!tenant) return null;
    const details = {
      ...input,
      databaseName: tenant.dbName,
      host: tenant.dbHost,
      preservesExistingData: true
    };
    return this.runTenantProvisioning(tenant, operation, details);
  }

  private async runTenantProvisioning(
    tenant: NonNullable<Awaited<ReturnType<DatabaseMaintenanceRepository["findTenant"]>>>,
    operation: "migrate" | "reinstall" | "setup",
    details: DatabaseActionPayload & Record<string, unknown>
  ) {
    const started = await this.repository.recordRun({
      databaseName: tenant.dbName,
      details,
      operation,
      scope: "tenant",
      status: "running",
      targetKey: String(tenant.id)
    });
    try {
      const result = await provisionTenantDatabase(tenant);
      const completedDetails = { ...details, ...result };
      const run = await this.repository.updateRunStatus(started.id, "completed", completedDetails);
      await this.activity.recordActivity({
        action: `database.tenant.${operation === "migrate" ? "migrated" : operation}`,
        details: completedDetails,
        moduleKey: "platform.database-maintenance",
        recordId: tenant.id,
        recordLabel: tenant.tenantCode,
        recordUuid: tenant.uuid
      });
      return run;
    } catch (error) {
      await this.repository.updateRunStatus(started.id, "failed", {
        ...details,
        error: errorMessage(error, "Tenant database installation failed.")
      });
      throw error;
    }
  }

  async requestTenantBackup(tenantId: number, input: DatabaseActionPayload = {}) {
    const tenant = await this.repository.findTenant(tenantId);
    if (!tenant) return null;
    const run = await this.repository.recordRun({
      databaseName: tenant.dbName,
      details: {
        ...input,
        host: tenant.dbHost,
        policy: "operator-backup-required",
        port: tenant.dbPort,
        storageRoot: tenant.storageRoot,
        tenantCode: tenant.tenantCode,
        tenantKey: tenant.slug || tenant.tenantCode,
        user: tenant.dbUser
      },
      operation: "backup",
      scope: "tenant",
      status: "requested",
      targetKey: String(tenant.id)
    });
    if (run) await this.enqueueMaintenanceRun(run.id, "tenant", tenant.id);
    await this.activity.recordActivity({
      action: "database.tenant.backup-requested",
      details: input,
      moduleKey: "platform.database-maintenance",
      recordId: tenant.id,
      recordLabel: tenant.tenantCode,
      recordUuid: tenant.uuid
    });
    return run;
  }

  async requestMasterRestore(input: DatabaseActionPayload = {}) {
    const run = await this.repository.recordRun({
      databaseName: platformDatabaseName(),
      details: {
        ...input,
        host: env.DB_HOST,
        policy: "sandbox-restore-required",
        port: env.DB_PORT,
        user: env.DB_USER
      },
      operation: "restore",
      scope: "master",
      status: "requested",
      targetKey: "master"
    });
    if (run) await this.enqueueMaintenanceRun(run.id, "master", null);
    await this.activity.recordActivity({
      action: "database.master.restore-requested",
      details: input,
      moduleKey: "platform.database-maintenance",
      recordLabel: platformDatabaseName()
    });
    return run;
  }

  async requestTenantRestore(tenantId: number, input: DatabaseActionPayload = {}) {
    const tenant = await this.repository.findTenant(tenantId);
    if (!tenant) return null;
    const run = await this.repository.recordRun({
      databaseName: tenant.dbName,
      details: {
        ...input,
        host: tenant.dbHost,
        policy: "sandbox-restore-required",
        port: tenant.dbPort,
        storageRoot: tenant.storageRoot,
        tenantCode: tenant.tenantCode,
        tenantKey: tenant.slug || tenant.tenantCode,
        user: tenant.dbUser
      },
      operation: "restore",
      scope: "tenant",
      status: "requested",
      targetKey: String(tenant.id)
    });
    if (run) await this.enqueueMaintenanceRun(run.id, "tenant", tenant.id);
    await this.activity.recordActivity({
      action: "database.tenant.restore-requested",
      details: input,
      moduleKey: "platform.database-maintenance",
      recordId: tenant.id,
      recordLabel: tenant.tenantCode,
      recordUuid: tenant.uuid
    });
    return run;
  }

  private enqueueMaintenanceRun(
    runId: number,
    scope: "master" | "tenant",
    tenantId: number | null
  ) {
    return this.queue.enqueue({
      correlationId: `database-maintenance:${runId}`,
      idempotencyKey: `database-maintenance:${runId}`,
      jobName: "database-maintenance.run",
      maxAttempts: 3,
      payload: { runId, scope },
      queueName: "maintenance",
      sourceModule: "platform.database-maintenance",
      tenantId: tenantId ? String(tenantId) : null
    });
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
