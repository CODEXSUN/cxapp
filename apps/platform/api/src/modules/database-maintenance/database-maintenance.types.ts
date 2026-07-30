export type DatabaseScope = "master" | "tenant";
export type DatabaseOperation =
  "backup" | "migrate" | "refresh" | "reinstall" | "restore" | "setup" | "status";
export type DatabaseRunStatus = "completed" | "failed" | "requested" | "running";

export type DatabaseMigrationRow = {
  appliedAt: string;
  name: string;
};

export type DatabaseTableInfo = {
  autoIncrement: number | null;
  collation: string | null;
  comment: string;
  createdAt: string | null;
  dataBytes: number;
  engine: string | null;
  indexBytes: number;
  name: string;
  recordCount: number;
  updatedAt: string | null;
};

export type DatabaseMigrationPlan = {
  applied: DatabaseMigrationRow[];
  available: Array<{ description: string; name: string }>;
  dryRunScript: string[];
  latestApplied: DatabaseMigrationRow | null;
  latestPending: { description: string; name: string } | null;
  pending: Array<{ description: string; name: string }>;
};

export type DatabaseMaintenanceRun = {
  completedAt: string | null;
  createdAt: string;
  databaseName: string;
  details: Record<string, unknown>;
  id: number;
  operation: DatabaseOperation;
  scope: DatabaseScope;
  status: DatabaseRunStatus;
  targetKey: string;
  uuid: string;
};

export type MasterDatabaseStatus = {
  backupStatus: "operator-required" | "verified";
  databaseName: string;
  host: string;
  migrations: DatabaseMigrationRow[];
  port: number;
  restoreStatus: "not-configured" | "sandbox-configured";
  runs: DatabaseMaintenanceRun[];
  status: "online" | "offline";
  tableCount: number;
  version: string;
};

export type TenantDatabaseStatus = {
  databaseName: string;
  host: string;
  migrations: DatabaseMigrationRow[];
  port: number;
  runs: DatabaseMaintenanceRun[];
  status: "online" | "offline";
  tableCount: number;
  tenantCode: string;
  tenantId: number;
  tenantName: string;
  version: string;
};

export type TenantDatabaseDetails = TenantDatabaseStatus & {
  migrationPlan: DatabaseMigrationPlan;
  tables: DatabaseTableInfo[];
};

export type DatabaseActionPayload = {
  backupId?: string | undefined;
  backupPath?: string | undefined;
  liveRestoreConfirm?: string | undefined;
  note?: string | undefined;
  restoreMode?: "live" | "sandbox" | undefined;
  tenantId?: number | undefined;
};
