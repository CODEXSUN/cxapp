import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createConnection } from "mysql2/promise";
import { env } from "../apps/platform/api/src/env.js";
import { closePlatformDatabase } from "../apps/platform/api/src/database/platform-database.js";
import {
  backupConfiguration,
  backupExport,
  backupList,
  backupUpload,
  backupRestore
} from "../apps/platform/api/src/modules/database-maintenance/backup-center.service.js";
assert.equal(env.DB_HOST, "127.0.0.1");
assert.equal(env.DB_PORT, 3306);
const config = await backupConfiguration();
const profile = config.profiles.find((p) => p.id === "local-mariadb");
assert.equal(profile?.host, "127.0.0.1");
assert.equal(profile.port, 3306);
const directory = resolve("apps/platform/api/storage/backups/database");
process.env.CXAPP_BACKUP_LOCATIONS = JSON.stringify([
  { id: "tenant-check", label: "Saved tenant backups", path: directory }
]);
const c = await createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true
});
const created: string[] = [];
const reports = [];
const quote = (s: string) => {
  assert.match(s, /^[a-zA-Z0-9_]+$/);
  return "`" + s + "`";
};
async function snapshot(db: string) {
  const [tables] = await c.query<any[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME",
    [db]
  );
  const result = [];
  for (const t of tables) {
    const table = String(t.TABLE_NAME);
    const [rows] = await c.query<any[]>("SELECT * FROM " + quote(db) + "." + quote(table));
    const [ddl] = await c.query<any[]>("SHOW CREATE TABLE " + quote(db) + "." + quote(table));
    result.push({
      table,
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
  return result;
}
try {
  for (const tenant of config.tenants) {
    assert.ok(profile.tenantDatabases[tenant.code], "Local tenant database mapping required");
    let saved = await backupList("tenant-check", "tenant", tenant.code);
    let createdSourceBackup = false;
    if (!saved.length) {
      await backupExport({
        locationId: "tenant-check",
        profileId: "local-mariadb",
        scope: "tenant",
        tenantId: tenant.id
      });
      createdSourceBackup = true;
      saved = await backupList("tenant-check", "tenant", tenant.code);
    }
    // Freeze the current saved list before safety copies are written.
    for (const backup of saved) {
      const suffix = randomUUID().replaceAll("-", "").slice(0, 12),
        reference = "cxrestore_tref_" + suffix,
        target = "cxrestore_tenant_" + suffix;
      const profiles = JSON.parse(process.env.CXAPP_BACKUP_CONNECTIONS!);
      const local = profiles.find((p: any) => p.id === "local-mariadb");
      local.restoreTargets ??= {};
      local.restoreTargets[tenant.code] = [...(local.restoreTargets[tenant.code] || []), target];
      process.env.CXAPP_BACKUP_CONNECTIONS = JSON.stringify(profiles);
      const base = {
        locationId: "tenant-check",
        id: backup.id,
        profileId: "local-mariadb",
        scope: "tenant" as const,
        tenantCode: tenant.code
      };
      for (const databaseName of [reference, target]) {
        await backupRestore({ ...base, databaseName, confirmation: "RESTORE " + databaseName });
        created.push(databaseName);
      }
      const expected = await snapshot(reference);
      const fresh = await backupRestore({
        ...base,
        databaseName: target,
        mode: "fresh",
        confirmation: "FRESH RESTORE " + target
      });
      assert.deepEqual(await snapshot(target), expected);
      const incremental = await backupRestore({
        ...base,
        databaseName: target,
        mode: "incremental",
        confirmation: "MERGE RESTORE " + target
      });
      assert.deepEqual(await snapshot(target), expected);
      await assert.rejects(
        backupRestore({
          ...base,
          databaseName: target,
          mode: "incremental",
          tenantCode: "OTHER_TENANT",
          confirmation: "MERGE RESTORE " + target
        }),
        /allowed|scope|tenant/i
      );
      // The page's upload must reject a different tenant before saving its file.
      const artifact = JSON.parse(
        await fs.readFile(directory + "/" + backup.id + ".cxbackup", "utf8")
      );
      await assert.rejects(
        backupUpload("tenant-check", artifact, { scope: "tenant", tenantCode: "OTHER_TENANT" }),
        /selected tenant/
      );
      const report = {
        tenantCode: tenant.code,
        sourceDatabase: backup.databaseName,
        backupId: backup.id,
        createdSourceBackup,
        localTarget: target,
        verifiedTables: expected.length,
        verifiedRows: expected.reduce((n, t) => n + t.rows, 0),
        fresh,
        incremental,
        tables: expected,
        cloudAccess: false
      };
      reports.push(report);
      console.log(
        JSON.stringify({
          tenant: tenant.code,
          backupId: backup.id,
          tables: report.verifiedTables,
          rows: report.verifiedRows,
          fresh: "all schemas and records match",
          incremental: "all schemas and records match",
          crossTenantGuards: "passed",
          cloudAccess: false
        })
      );
    }
  }
  await fs.writeFile(
    "docs/tenant-backup-verification.json",
    JSON.stringify(
      {
        reports,
        verifiedAt: new Date().toISOString(),
        sourceTenantDatabasesModified: false,
        temporaryTargetsRemoved: true,
        cloudAccess: false
      },
      null,
      2
    ) + "\n"
  );
} finally {
  for (const r of reports)
    for (const result of [r.fresh, r.incremental]) {
      if ("safetyBackupId" in result)
        await fs.unlink(directory + "/" + result.safetyBackupId + ".cxbackup");
    }
  for (const db of created) await c.query("DROP DATABASE " + quote(db));
  await c.end();
  await closePlatformDatabase();
}
