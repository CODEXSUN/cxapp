import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createConnection } from "mysql2/promise";
import { env } from "../apps/platform/api/src/env.js";
import { closePlatformDatabase } from "../apps/platform/api/src/database/platform-database.js";
import {
  backupConfiguration,
  backupRestore,
  backupDownload
} from "../apps/platform/api/src/modules/database-maintenance/backup-center.service.js";
assert.equal(env.DB_HOST, "127.0.0.1");
assert.equal(env.DB_PORT, 3306);
const config = await backupConfiguration();
const local = config.profiles.find((p) => p.id === "local-mariadb");
assert.equal(local?.host, "127.0.0.1");
assert.equal(local?.port, 3306);
assert.ok(local.allowRestore && local.allowExistingRestore);
assert.ok(local.restoreTargets.master?.includes("cxrestore_db"));
process.env.CXAPP_BACKUP_LOCATIONS = JSON.stringify([
  {
    id: "current",
    label: "Current saved backups",
    path: resolve("apps/platform/api/storage/backups/database")
  }
]);
const id = "1c351270-63c9-45ac-b84f-6c9b50e6ef9a";
const artifact = await backupDownload("current", id);
const c = await createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true
});
const reference = "cxrestore_reference_" + randomUUID().replaceAll("-", "").slice(0, 12);
let referenceCreated = false;
const base = {
  locationId: "current",
  id,
  profileId: "local-mariadb",
  scope: "master" as const,
  tenantCode: ""
};
const quote = (s: string) => {
  assert.match(s, /^[a-zA-Z0-9_]+$/);
  return "`" + s + "`";
};
async function snapshot(database: string) {
  const [tables] = await c.query<any[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME",
    [database]
  );
  const output = [];
  for (const t of tables) {
    const name = String(t.TABLE_NAME);
    const [rows] = await c.query<any[]>("SELECT * FROM " + quote(database) + "." + quote(name));
    const [ddl] = await c.query<any[]>("SHOW CREATE TABLE " + quote(database) + "." + quote(name));
    output.push({
      table: name,
      rows: rows.length,
      dataHash: createHash("sha256")
        .update(
          rows
            .map((r) => JSON.stringify(r))
            .sort()
            .join("\n")
        )
        .digest("hex"),
      schemaHash: createHash("sha256")
        .update(
          String(ddl[0]["Create Table"])
            .replace(/AUTO_INCREMENT=\d+\s*/gi, "")
            .replace(/\r/g, "")
        )
        .digest("hex")
    });
  }
  return output;
}
try {
  const before = await snapshot("cxrestore_db");
  await backupRestore({ ...base, databaseName: reference, confirmation: "RESTORE " + reference });
  referenceCreated = true;
  const expected = await snapshot(reference);
  const fresh = await backupRestore({
    ...base,
    databaseName: "cxrestore_db",
    mode: "fresh",
    confirmation: "FRESH RESTORE cxrestore_db"
  });
  const afterFresh = await snapshot("cxrestore_db");
  assert.deepEqual(afterFresh, expected);
  const incremental = await backupRestore({
    ...base,
    databaseName: "cxrestore_db",
    mode: "incremental",
    confirmation: "MERGE RESTORE cxrestore_db"
  });
  const afterIncremental = await snapshot("cxrestore_db");
  assert.deepEqual(afterIncremental, expected);
  const safety = await backupDownload(
    "current",
    ("safetyBackupId" in fresh ? fresh.safetyBackupId : "") as string
  );
  const report = {
    target: "cxrestore_db",
    host: "127.0.0.1:3306",
    backupId: id,
    sourceDatabase: artifact.databaseName,
    sourceSqlBytes: Buffer.byteLength(artifact.sql),
    before: { tables: before.length, rows: before.reduce((n, t) => n + t.rows, 0) },
    fresh: { passed: true, ...fresh },
    incremental: { passed: true, ...incremental },
    verifiedTables: expected.length,
    verifiedRows: expected.reduce((n, t) => n + t.rows, 0),
    preFreshBackupSqlBytes: Buffer.byteLength(safety.sql),
    tables: expected,
    cloudAccess: false
  };
  await fs.writeFile("docs/cxrestore-db-verification.json", JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      before: report.before,
      verifiedTables: report.verifiedTables,
      verifiedRows: report.verifiedRows,
      fresh: "all schemas and records match",
      incremental: "all schemas and records match",
      freshSafetyBackup: "safetyBackupId" in fresh ? fresh.safetyBackupId : null,
      incrementalSafetyBackup: "safetyBackupId" in incremental ? incremental.safetyBackupId : null,
      cloudAccess: false
    })
  );
} finally {
  if (referenceCreated) await c.query("DROP DATABASE " + quote(reference));
  await c.end();
  await closePlatformDatabase();
}
