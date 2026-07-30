import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createConnection } from "mysql2/promise";
import { env } from "../../env.js";
import { assertDatabaseName, quoteIdentifier } from "../../database/database-utils.js";
import { databaseBackupPath } from "../storage-manager/storage-manager.paths.js";

export type DatabaseExecutionTarget = {
  databaseName: string;
  host: string;
  password: string;
  port: number;
  tenantKey?: string;
  user: string;
};

export async function executeDatabaseBackup(input: {
  operation: string;
  runId: number;
  scope: string;
  target: DatabaseExecutionTarget;
}) {
  const databaseName = assertDatabaseName(input.target.databaseName);
  const backup = databaseBackupPath({
    databaseName,
    runId: input.runId,
    scope: input.scope === "tenant" ? "tenant" : "master",
    ...(input.target.tenantKey ? { tenantKey: input.target.tenantKey } : {})
  });
  await mkdir(dirname(backup.filePath), { recursive: true });

  const sqlDump = await createSqlDump(input.target);
  await writeFile(backup.filePath, sqlDump, "utf8");
  const file = await stat(backup.filePath);
  const checksum = createHash("sha256").update(sqlDump).digest("hex");

  return {
    backupId: backup.backupId,
    checksum,
    filePath: backup.filePath,
    sizeBytes: file.size,
    storage: "local-sql",
    verifiedAt: new Date().toISOString()
  };
}

export async function executeDatabaseRestore(input: {
  backupPath: string;
  liveRestoreConfirm?: string;
  operation: string;
  restoreMode?: string;
  runId: number;
  scope: string;
  target: DatabaseExecutionTarget;
}) {
  const liveRestore = input.restoreMode === "live";
  const restoreDatabaseName = liveRestore
    ? liveRestoreName(input.target.databaseName, input.liveRestoreConfirm)
    : restoreSandboxName(input.target.databaseName);
  const dump = await readFile(resolve(input.backupPath), "utf8");
  const connection = await createConnection({
    host: input.target.host,
    password: input.target.password,
    port: input.target.port,
    timezone: "Z",
    user: input.target.user
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(restoreDatabaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE ${quoteIdentifier(restoreDatabaseName)}`);
    await connection.query("SET FOREIGN_KEY_CHECKS=0");
    for (const statement of splitSqlStatements(dump)) {
      const trimmed = statement.trim();
      if (
        !trimmed ||
        trimmed.startsWith("--") ||
        trimmed.toUpperCase().startsWith("CREATE DATABASE") ||
        trimmed.toUpperCase().startsWith("USE ")
      ) {
        continue;
      }
      await connection.query(trimmed);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    await connection.end();
  }

  return {
    restoredAt: new Date().toISOString(),
    restoredDatabaseName: restoreDatabaseName,
    sandboxOnly: !liveRestore,
    sourceBackupPath: resolve(input.backupPath)
  };
}

function liveRestoreName(sourceDatabaseName: string, confirmation: string | undefined) {
  if (
    env.CODEXSUN_ALLOW_LIVE_RESTORE !== "1" ||
    env.CODEXSUN_LIVE_RESTORE_CONFIRM !== "ALLOW_LIVE_RESTORE"
  ) {
    throw new Error(
      "Live restore is disabled. Set CODEXSUN_ALLOW_LIVE_RESTORE=1 and CODEXSUN_LIVE_RESTORE_CONFIRM=ALLOW_LIVE_RESTORE only during an approved restore window."
    );
  }
  const databaseName = assertDatabaseName(sourceDatabaseName, "live restore database name");
  if (confirmation !== `RESTORE ${databaseName}`) {
    throw new Error(`Live restore requires confirmation: RESTORE ${databaseName}`);
  }
  return databaseName;
}

function restoreSandboxName(sourceDatabaseName: string) {
  if (env.NODE_ENV === "production" && !env.CODEXSUN_RESTORE_TEST_DB_NAME) {
    throw new Error("Production restore requires CODEXSUN_RESTORE_TEST_DB_NAME.");
  }
  return assertDatabaseName(
    env.CODEXSUN_RESTORE_TEST_DB_NAME || `${sourceDatabaseName}_restore_sandbox`,
    "restore sandbox database name"
  );
}

async function createSqlDump(target: DatabaseExecutionTarget) {
  const databaseName = assertDatabaseName(target.databaseName);
  const connection = await createConnection({
    database: databaseName,
    host: target.host,
    password: target.password,
    port: target.port,
    timezone: "Z",
    user: target.user
  });

  try {
    const [tableRows] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableNames = Array.isArray(tableRows)
      ? tableRows
          .map((row) => String(Object.values(row as Record<string, unknown>)[0]))
          .filter(Boolean)
      : [];
    const chunks = [
      `-- CODEXSUN database backup`,
      `-- database: ${databaseName}`,
      `-- created_at: ${new Date().toISOString()}`,
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
      `USE ${quoteIdentifier(databaseName)};`,
      `SET FOREIGN_KEY_CHECKS=0;`
    ];

    for (const tableName of tableNames) {
      const safeTableName = assertDatabaseName(tableName, "table name");
      const [createRows] = await connection.query(
        `SHOW CREATE TABLE ${quoteIdentifier(safeTableName)}`
      );
      const createSql = String(
        (createRows as Array<Record<string, unknown>>)[0]?.["Create Table"] ?? ""
      );
      chunks.push(`DROP TABLE IF EXISTS ${quoteIdentifier(safeTableName)};`, `${createSql};`);

      const [rows] = await connection.query(`SELECT * FROM ${quoteIdentifier(safeTableName)}`);
      if (Array.isArray(rows) && rows.length > 0) {
        const columns = Object.keys(rows[0] as Record<string, unknown>)
          .map(quoteIdentifier)
          .join(", ");
        for (const row of rows as Array<Record<string, unknown>>) {
          const values = Object.values(row).map(sqlValue).join(", ");
          chunks.push(
            `INSERT INTO ${quoteIdentifier(safeTableName)} (${columns}) VALUES (${values});`
          );
        }
      }
    }

    chunks.push("SET FOREIGN_KEY_CHECKS=1;", "");
    return chunks.join("\n");
  } finally {
    await connection.end();
  }
}

function sqlValue(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date)
    return `'${escapeSql(value.toISOString().slice(0, 19).replace("T", " "))}'`;
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  return `'${escapeSql(String(value))}'`;
}

function escapeSql(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    current += char;
    if (char === "'" && next !== "'") inString = !inString;
    if (char === "'" && next === "'") {
      current += next;
      index += 1;
      continue;
    }
    if (char === ";" && !inString) {
      statements.push(current);
      current = "";
    }
  }
  if (current.trim()) statements.push(current);
  return statements;
}
