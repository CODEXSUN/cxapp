import { closePlatformDatabase } from "../apps/platform/api/src/database/platform-database.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createConnection } from "mysql2/promise";
import { env } from "../apps/platform/api/src/env.js";
import {
  backupUpload,
  backupRestore,
  backupConfiguration
} from "../apps/platform/api/src/modules/database-maintenance/backup-center.service.js";

assert.equal(env.DB_HOST, "127.0.0.1");
assert.equal(env.DB_PORT, 3306);
const backupPath = resolve(
  process.argv[2] ||
    "apps/platform/api/storage/backups/database/1c351270-63c9-45ac-b84f-6c9b50e6ef9a.cxbackup"
);
const artifact = JSON.parse(await fs.readFile(backupPath, "utf8"));
assert.equal(artifact.scope, "master");
const configuration = await backupConfiguration();
assert.ok(
  configuration.profiles.some(
    (p) => p.id === "local-mariadb" && p.allowRestore && p.allowExistingRestore
  )
);
const suffix = randomUUID().replaceAll("-", "").slice(0, 12),
  a = "cxrestore_verify_a_" + suffix,
  b = "cxrestore_verify_b_" + suffix;
const directory = await fs.mkdtemp(join(tmpdir(), "cxapp-current-backup-"));
const connection = await createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true
});
const created: string[] = [];
const quote = (s: string) => "`" + s + "`";
try {
  process.env.CXAPP_BACKUP_CONNECTIONS = JSON.stringify([
    {
      id: "verify-local",
      label: "Temporary local verification",
      host: "127.0.0.1",
      port: 3306,
      user: env.DB_USER,
      passwordEnv: "DB_PASSWORD",
      masterDatabase: a,
      allowRestore: true,
      allowExistingRestore: true,
      restoreTargets: { master: [b] }
    }
  ]);
  process.env.CXAPP_BACKUP_LOCATIONS = JSON.stringify([
    { id: "verify", label: "Temporary verification", path: directory }
  ]);
  process.env.CXAPP_BACKUP_RESTORE_ENABLED = "1";
  const saved = await backupUpload("verify", artifact);
  const base = {
    locationId: "verify",
    id: saved.id,
    profileId: "verify-local",
    scope: "master" as const,
    tenantCode: ""
  };
  for (const databaseName of [a, b]) {
    await backupRestore({ ...base, databaseName, confirmation: "RESTORE " + databaseName });
    created.push(databaseName);
  }
  const [tables] = await connection.query<any[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME",
    [a]
  );
  async function fingerprint(database: string) {
    let rowCount = 0;
    const hash = createHash("sha256");
    for (const t of tables) {
      const name = String(t.TABLE_NAME);
      const [rows] = await connection.query<any[]>(
        "SELECT * FROM " + quote(database) + "." + quote(name)
      );
      const serialized = rows.map((r) => JSON.stringify(r)).sort();
      rowCount += rows.length;
      hash.update(name + "\n" + serialized.join("\n") + "\n");
    }
    return { tables: tables.length, rows: rowCount, sha256: hash.digest("hex") };
  }
  const expected = await fingerprint(a);
  await connection.query(
    "CREATE TABLE " + quote(b) + ".cxapp_restore_probe(id INT PRIMARY KEY) ENGINE=InnoDB"
  );
  const fresh = await backupRestore({
    ...base,
    databaseName: b,
    mode: "fresh",
    confirmation: "FRESH RESTORE " + b
  });
  assert.deepEqual(await fingerprint(b), expected);
  assert.equal(fresh.tableCount, expected.tables);
  assert.ok("safetyBackupId" in fresh);
  await connection.query(
    "CREATE TABLE " + quote(b) + ".cxapp_restore_probe(id INT PRIMARY KEY) ENGINE=InnoDB"
  );
  await connection.query("INSERT INTO " + quote(b) + ".cxapp_restore_probe VALUES(1)");
  if (tables.some((t) => t.TABLE_NAME === "tenants"))
    await connection.query(
      "UPDATE " + quote(b) + ".tenants SET tenant_name=? ORDER BY id LIMIT 1",
      ["LOCAL RESTORE VERIFICATION"]
    );
  const incremental = await backupRestore({
    ...base,
    databaseName: b,
    mode: "incremental",
    confirmation: "MERGE RESTORE " + b
  });
  assert.deepEqual(await fingerprint(b), expected);
  assert.ok("safetyBackupId" in incremental);
  const [probe] = await connection.query<any[]>(
    "SELECT * FROM " + quote(b) + ".cxapp_restore_probe"
  );
  assert.equal(probe.length, 1);
  console.log(
    JSON.stringify({
      backupId: artifact.id,
      sourceDatabase: artifact.databaseName,
      createdAt: artifact.createdAt,
      verifiedTables: expected.tables,
      verifiedRows: expected.rows,
      fresh: "passed: exact table-data match and extra table removed",
      incremental:
        "passed: changed tenant name restored, exact table-data match and extra table retained",
      preRestoreBackups: "created in both modes",
      cloudWrites: 0
    })
  );
} finally {
  for (const name of created) await connection.query("DROP DATABASE " + quote(name));
  await connection.end();
  await closePlatformDatabase();
  await fs.rm(directory, { recursive: true, force: true });
}
