import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "mysql2/promise";
import { env } from "../apps/platform/api/src/env.js";
import {
  backupExport,
  backupDownload,
  backupList,
  backupUpload,
  backupRestore
} from "../apps/platform/api/src/modules/database-maintenance/backup-center.service.js";

test(
  "local MariaDB export/download/upload/restore preserves rows and blocks read-only or existing targets",
  { skip: process.env.CXAPP_BACKUP_LOCAL_TEST !== "1" },
  async () => {
    // This opt-in test is restricted to the installed local MariaDB service, never a tunnel.
    assert.equal(env.DB_HOST, "127.0.0.1");
    assert.equal(env.DB_PORT, 3306);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
    const source = "cxrestore_test_source_" + suffix,
      target = "cxrestore_test_target_" + suffix;
    const dir = await mkdtemp(join(tmpdir(), "cxapp-backup-test-"));
    const connection = await createConnection({
      host: "127.0.0.1",
      port: 3306,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true
    });
    const saved = {
      connections: process.env.CXAPP_BACKUP_CONNECTIONS,
      locations: process.env.CXAPP_BACKUP_LOCATIONS,
      enabled: process.env.CXAPP_BACKUP_RESTORE_ENABLED
    };
    let madeSource = false,
      madeTarget = false;
    try {
      await connection.query("CREATE DATABASE `" + source + "`");
      madeSource = true;
      await connection.changeUser({ database: source });
      await connection.query(
        "CREATE TABLE sample (id BIGINT UNSIGNED PRIMARY KEY, note TEXT, amount DECIMAL(24,6), bytes BLOB, doubled DECIMAL(25,6) AS (amount * 2) STORED) ENGINE=InnoDB"
      );
      const note = "quotes ' and \\ slash; -- comment\nnext line: தமிழ் 😀";
      await connection.execute("INSERT INTO sample(id,note,amount,bytes) VALUES (?,?,?,?)", [
        "18446744073709551615",
        note,
        "123456789012345678.123456",
        Buffer.from([0, 255, 39, 92])
      ]);
      process.env.CXAPP_BACKUP_CONNECTIONS = JSON.stringify([
        {
          id: "local-test",
          label: "Local test",
          host: "127.0.0.1",
          port: 3306,
          user: env.DB_USER,
          passwordEnv: "DB_PASSWORD",
          masterDatabase: source,
          allowRestore: true
        }
      ]);
      process.env.CXAPP_BACKUP_LOCATIONS = JSON.stringify([
        { id: "test", label: "Temporary test", path: dir }
      ]);
      process.env.CXAPP_BACKUP_RESTORE_ENABLED = "1";
      const backup = await backupExport({
        profileId: "local-test",
        locationId: "test",
        scope: "master"
      });
      const direct = await backupExport({
        profileId: "local-test",
        locationId: "not-a-server-folder",
        scope: "master",
        downloadOnly: true
      });
      assert.ok("sql" in direct, "direct local save must return the complete artifact");
      assert.equal(
        (await backupList("test", "master", "")).length,
        1,
        "direct local save must not create a server backup file"
      );
      const downloaded = await backupDownload("test", backup.id);
      assert.equal((await backupList("test", "master", "")).length, 1);
      const uploaded = await backupUpload("test", downloaded);
      assert.notEqual(uploaded.id, backup.id);
      await assert.rejects(
        backupUpload("test", { ...downloaded, sql: downloaded.sql + "corrupt" }),
        /checksum/
      );
      const input = {
        locationId: "test",
        id: uploaded.id,
        profileId: "local-test",
        databaseName: target,
        confirmation: "RESTORE " + target,
        scope: "master" as const,
        tenantCode: ""
      };
      await assert.rejects(backupRestore({ ...input, profileId: "configured" }), /read only/);
      await assert.rejects(backupRestore({ ...input, confirmation: "wrong" }), /confirmation/);
      await assert.rejects(
        backupRestore({ ...input, scope: "tenant", tenantCode: "OTHER" }),
        /scope and tenant/
      );
      const result = await backupRestore(input);
      madeTarget = true;
      assert.equal(result.tableCount, 1);
      await assert.rejects(backupRestore(input), /exists/);
      const [a] = await connection.query("SELECT * FROM `" + source + "`.sample");
      const [b] = await connection.query("SELECT * FROM `" + target + "`.sample");
      assert.deepEqual(b, a);
      await assert.rejects(
        backupRestore({ ...input, mode: "fresh", confirmation: "FRESH RESTORE " + target }),
        /disabled for/
      );
      const extra = JSON.parse(process.env.CXAPP_BACKUP_CONNECTIONS!);
      extra[0].allowExistingRestore = true;
      extra[0].restoreTargets = { master: [target] };
      process.env.CXAPP_BACKUP_CONNECTIONS = JSON.stringify(extra);
      await connection.query(
        "UPDATE \u0060" + target + "\u0060.sample SET note='local modification'"
      );
      await connection.query(
        "INSERT INTO \u0060" + target + "\u0060.sample(id,note) VALUES (1,'keep local row')"
      );
      await connection.query(
        "INSERT INTO \u0060" + source + "\u0060.sample(id,note) VALUES (2,'second')"
      );
      const mergeBackup = await backupExport({
        profileId: "local-test",
        locationId: "test",
        scope: "master"
      });
      const mergeInput = {
        ...input,
        id: mergeBackup.id,
        mode: "incremental" as const,
        confirmation: "MERGE RESTORE " + target
      };
      await assert.rejects(
        backupRestore({ ...mergeInput, confirmation: "RESTORE " + target }),
        /confirmation/
      );
      const merged = await backupRestore(mergeInput);
      assert.ok("safetyBackupId" in merged);
      const [mergedRows] = await connection.query<any[]>(
        "SELECT id,note FROM \u0060" + target + "\u0060.sample ORDER BY id"
      );
      assert.equal(mergedRows.length, 3);
      assert.equal(mergedRows[0].note, "keep local row");
      assert.equal(mergedRows[2].note, note);
      await connection.query(
        "CREATE TABLE \u0060" + target + "\u0060.extra_table(id INT) ENGINE=InnoDB"
      );
      const fresh = await backupRestore({
        ...mergeInput,
        mode: "fresh",
        confirmation: "FRESH RESTORE " + target
      });
      assert.equal(fresh.tableCount, 1);
      const [freshRows] = await connection.query(
        "SELECT * FROM \u0060" + target + "\u0060.sample ORDER BY id"
      );
      const [sourceRows] = await connection.query(
        "SELECT * FROM \u0060" + source + "\u0060.sample ORDER BY id"
      );
      assert.deepEqual(freshRows, sourceRows);
      await connection.query(
        "ALTER TABLE \u0060" + target + "\u0060.sample ADD COLUMN different INT"
      );
      await assert.rejects(backupRestore(mergeInput), /Schema mismatch/);
      await connection.query("ALTER TABLE \u0060" + target + "\u0060.sample DROP COLUMN different");
      for (const db of [source, target])
        await connection.query(
          "ALTER TABLE \u0060" + db + "\u0060.sample ADD UNIQUE KEY note_unique(note(100))"
        );
      const conflictBackup = await backupExport({
        profileId: "local-test",
        locationId: "test",
        scope: "master"
      });
      await connection.query("DELETE FROM \u0060" + target + "\u0060.sample WHERE id=2");
      await connection.query(
        "INSERT INTO \u0060" + target + "\u0060.sample(id,note) VALUES(3,'second')"
      );
      await connection.query(
        "UPDATE \u0060" +
          target +
          "\u0060.sample SET note='must remain on rollback' WHERE id=18446744073709551615"
      );
      await assert.rejects(backupRestore({ ...mergeInput, id: conflictBackup.id }), /rolled back/);
      const [afterRollback] = await connection.query<any[]>(
        "SELECT note FROM \u0060" + target + "\u0060.sample WHERE id=18446744073709551615"
      );
      assert.equal(afterRollback[0].note, "must remain on rollback");
      await connection.query("DELETE FROM \u0060" + target + "\u0060.sample WHERE id=3");
      for (const db of [source, target]) {
        await connection.changeUser({ database: db });
        await connection.query(
          "CREATE TABLE \u0060" +
            db +
            "\u0060.z_parent(id INT PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        await connection.query(
          "CREATE TABLE \u0060" +
            db +
            "\u0060.a_child(id INT PRIMARY KEY,parent_id INT,CONSTRAINT fk_parent FOREIGN KEY(parent_id) REFERENCES z_parent(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
      }
      await connection.query("INSERT INTO \u0060" + source + "\u0060.z_parent VALUES(1)");
      await connection.query("INSERT INTO \u0060" + source + "\u0060.a_child VALUES(1,1)");
      const fkBackup = await backupExport({
        profileId: "local-test",
        locationId: "test",
        scope: "master"
      });
      await backupRestore({ ...mergeInput, id: fkBackup.id });
      const [children] = await connection.query<any[]>(
        "SELECT * FROM \u0060" + target + "\u0060.a_child"
      );
      assert.equal(children.length, 1);
    } finally {
      // Drop only databases created under unique test names in this run.
      if (madeTarget) await connection.query("DROP DATABASE `" + target + "`");
      if (madeSource) await connection.query("DROP DATABASE `" + source + "`");
      await connection.end();
      await rm(dir, { recursive: true, force: true });
      for (const [key, value] of [
        ["CXAPP_BACKUP_CONNECTIONS", saved.connections],
        ["CXAPP_BACKUP_LOCATIONS", saved.locations],
        ["CXAPP_BACKUP_RESTORE_ENABLED", saved.enabled]
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }
);
