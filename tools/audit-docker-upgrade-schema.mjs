import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";
import { createConnection } from "mysql2/promise";
const e = parseEnv(await fs.readFile(".env", "utf8"));
if (e.DB_HOST !== "127.0.0.1" || Number(e.DB_PORT) !== 3306) throw Error("Local database required");
const manifest = JSON.parse(
  await fs.readFile("storage/backups/hostinger/20261113T124552Z/manifest.json", "utf8")
);
const bin = "C:/Program Files/MariaDB 12.3/bin/";
const clientEnv = { ...process.env, MYSQL_PWD: e.DB_PASSWORD };
const c = await createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: e.DB_USER,
  password: e.DB_PASSWORD
});
function start(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { windowsHide: true, ...opts });
  let out = "",
    err = "";
  p.stdout.on("data", (b) => (out += b.toString()));
  p.stderr.on("data", (b) => (err += b.toString()));
  const done = new Promise((ok, no) => {
    p.on("error", no);
    p.on("close", (code) => ok({ code, out, err }));
  });
  return { p, done };
}
const q = (s) => "`" + s + "`";
const created = [],
  comparisons = [];
const prefix = "cxupgrade_" + Date.now() + "_";
let rehearsal;
try {
  for (const r of manifest.results) {
    const dump = start(
      bin + "mariadb-dump.exe",
      [
        "--no-defaults",
        "--host=127.0.0.1",
        "--port=3306",
        "--user=" + e.DB_USER,
        "--no-data",
        "--skip-comments",
        "--skip-add-locks",
        "--skip-disable-keys",
        "--default-character-set=utf8mb4",
        r.localDatabase
      ],
      { env: clientEnv }
    );
    dump.p.stdin.end();
    const output = await dump.done;
    if (output.code !== 0) throw Error("Schema dump failed");
    const current = new Map();
    let name = null,
      lines = [];
    for (const line of output.out.split("\n")) {
      const m = line.match(/^CREATE TABLE \x60([^\x60]+)\x60/);
      if (m) {
        name = m[1];
        lines = [line];
      } else if (name) {
        lines.push(line);
        if (line.endsWith(";")) {
          current.set(
            name,
            createHash("sha256")
              .update(lines.join("\n").replace(/AUTO_INCREMENT=\d+\s*/gi, ""))
              .digest("hex")
          );
          name = null;
        }
      }
    }
    const expected = new Map(r.tables.map((t) => [t.table, t.schemaHash]));
    comparisons.push({
      scope: r.scope,
      tenant: r.code,
      source: r.database,
      local: r.localDatabase,
      tables: current.size,
      added: [...current.keys()].filter((n) => !expected.has(n)),
      missing: [...expected.keys()].filter((n) => !current.has(n)),
      changed: [...expected.keys()].filter(
        (n) => current.has(n) && current.get(n) !== expected.get(n)
      )
    });
  }
  console.log("Compared schemas for all 13 restored databases.");
  for (const r of manifest.results) {
    const db = prefix + (r.scope === "master" ? "master" : r.code.toLowerCase());
    await c.query("CREATE DATABASE " + q(db) + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    created.push({ ...r, rehearsalDatabase: db });
    const restore = start(
      bin + "mariadb.exe",
      [
        "--no-defaults",
        "--host=127.0.0.1",
        "--port=3306",
        "--user=" + e.DB_USER,
        "--binary-mode",
        db
      ],
      { env: clientEnv }
    );
    await pipeline(createReadStream(r.backupFile), restore.p.stdin);
    const result = await restore.done;
    if (result.code !== 0) throw Error("Rehearsal restore failed for " + r.database);
  }
  const master = created.find((r) => r.scope === "master");
  for (const t of created.filter((r) => r.scope === "tenant"))
    await c.execute(
      "UPDATE " +
        q(master.rehearsalDatabase) +
        ".tenants SET db_host=?,db_port=?,db_name=?,db_user=?,db_secret_ref=? WHERE tenant_code=?",
      ["127.0.0.1", 3306, t.rehearsalDatabase, e.DB_USER, "DB_PASSWORD", t.code]
    );
  console.log("Running current migration code against 13 isolated pristine backup restores...");
  const migration = start(
    process.execPath,
    ["--import", "tsx", "apps/platform/api/src/database/db-cli.ts", "migrations:run"],
    {
      env: {
        ...process.env,
        DB_HOST: "127.0.0.1",
        DB_PORT: "3306",
        DB_MASTER_NAME: master.rehearsalDatabase,
        DEFAULT_TENANT_DB_NAME: created.find((r) => r.code === "CODEXSUN").rehearsalDatabase,
        CXAPP_QUEUE_WORKER_ENABLED: "0",
        MAIL_ENABLED: "0",
        ENABLE_DEFAULT_TENANT_SEED: "0",
        CXAPP_DB_FRESH_ON_START: "0"
      }
    }
  );
  migration.p.stdin.end();
  const result = await migration.done;
  await fs.writeFile(
    "storage/backups/hostinger/20261113T124552Z/upgrade-rehearsal.log",
    result.out + "\n" + result.err
  );
  rehearsal = {
    exitCode: result.code,
    passed: result.code === 0,
    localOnly: true,
    databases: 13,
    error: result.code === 0 ? null : (result.err || result.out).slice(-2000)
  };
  console.log("Migration rehearsal exit: " + result.code);
  const sourceTables = Object.fromEntries(
    manifest.results.map((r) => [r.code, r.tables.map((t) => t.table)])
  );
  const baseline = sourceTables.SUKRAA;
  const variation = manifest.results
    .filter((r) => r.scope === "tenant")
    .map((r) => ({
      tenant: r.code,
      tables: r.tableCount,
      extraAgainstCommon96: sourceTables[r.code].filter((n) => !baseline.includes(n)),
      missingAgainstCommon96: baseline.filter((n) => !sourceTables[r.code].includes(n))
    }));
  await fs.writeFile(
    "docs/docker-upgrade-schema-audit.json",
    JSON.stringify(
      {
        release: "1.0.81",
        sourceVpsVersion: "1.0.79",
        comparisonSource:
          "Fresh native VPS backups captured 13 November 2026; no new VPS access during audit.",
        comparisons,
        tenantSchemaVariation: variation,
        migrationRehearsal: rehearsal,
        vpsChanges: false
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    JSON.stringify({
      schemaDifferences: comparisons.filter(
        (r) => r.added.length || r.missing.length || r.changed.length
      ),
      migrationRehearsal: rehearsal
    })
  );
} finally {
  for (const r of created) await c.query("DROP DATABASE " + q(r.rehearsalDatabase));
  await c.end();
}
