export type DatabaseOperation = "backup" | "migrate" | "refresh" | "restore" | "status";
export type DatabaseRunStatus = "completed" | "failed" | "requested" | "running";

export type DatabaseMigrationRow = {
  appliedAt: string;
  name: string;
};

export type DatabaseMaintenanceRun = {
  completedAt: string | null;
  createdAt: string;
  databaseName: string;
  details: Record<string, unknown>;
  id: number;
  operation: DatabaseOperation;
  scope: "master" | "tenant";
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

export type DatabaseActionPayload = {
  backupId?: string | undefined;
  backupPath?: string | undefined;
  liveRestoreConfirm?: string | undefined;
  note?: string | undefined;
  restoreMode?: "live" | "sandbox" | undefined;
};
