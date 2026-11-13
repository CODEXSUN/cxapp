import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { createConnection } from "mysql2/promise";
const env = parseEnv(await fs.readFile(".env", "utf8"));
if (env.DB_HOST !== "127.0.0.1" || Number(env.DB_PORT) !== 3306)
  throw Error("Local MariaDB identity mismatch");
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d+Z$/, "Z");
const prefix = "cxvps_" + stamp.slice(0, 8) + "_" + stamp.slice(9, 15) + "_";
const root = resolve("storage/backups/hostinger", stamp);
await fs.mkdir(root, { recursive: true, mode: 0o700 });
const sshArgs = [
  "-o",
  "BatchMode=yes",
  "-o",
  "StrictHostKeyChecking=yes",
  "-o",
  "ConnectTimeout=15",
  "codexsun-hostinger"
];
const localBin = "C:/Program Files/MariaDB 12.3/bin/";
const localEnv = { ...process.env, MYSQL_PWD: env.DB_PASSWORD };
function start(binary, args, options = {}) {
  const p = spawn(binary, args, { windowsHide: true, ...options });
  let stderr = "";
  p.stderr.on("data", (x) => {
    stderr += x.toString();
  });
  const done = new Promise((yes, no) => {
    p.on("error", no);
    p.on("close", (code) =>
      code === 0 ? yes() : no(Error(binary + " failed, exit " + code + "; " + stderr.slice(0, 300)))
    );
  });
  return { p, done };
}
async function textSSH(code) {
  const { p, done } = start("ssh", [...sshArgs, "python3 -"]);
  let out = "";
  p.stdout.on("data", (x) => (out += x.toString()));
  p.stdin.end(code);
  await done;
  return JSON.parse(out);
}
const inventory = await textSSH(
  `import subprocess,json\nq="SELECT id,tenant_code,tenant_name,db_name FROM cxapp_master_db.tenants ORDER BY id"\nr=subprocess.run(['docker','exec','cxapp-mariadb','sh','-c','MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb -uroot --batch --skip-column-names -e "$1"','inventory',q],capture_output=True,text=True,check=True)\nprint(json.dumps([dict(zip(['id','code','name','database'],line.split('\\t'))) for line in r.stdout.splitlines()]))\n`
);
const entries = [
  { scope: "master", database: "cxapp_master_db", code: "MASTER" },
  ...inventory.map((t) => ({ ...t, scope: "tenant" }))
];
for (const entry of entries)
  if (!/^[a-zA-Z0-9_]+$/.test(entry.database)) throw Error("Invalid database identity");
const dumpFlags = [
  "--single-transaction",
  "--quick",
  "--skip-lock-tables",
  "--skip-add-locks",
  "--skip-disable-keys",
  "--skip-comments",
  "--skip-extended-insert",
  "--complete-insert",
  "--hex-blob",
  "--order-by-primary",
  "--default-character-set=utf8mb4",
  "--no-tablespaces",
  "--routines",
  "--triggers",
  "--events"
];
const c = await createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD
});
const quote = (s) => "`" + s + "`";
function digest(sql) {
  const tables = new Map();
  let schema = null;
  for (const line of sql.split("\n")) {
    const create = line.match(/^CREATE TABLE \x60([^\x60]+)\x60/);
    if (create) {
      schema = { name: create[1], lines: [line], rows: [] };
      tables.set(schema.name, schema);
      continue;
    }
    if (schema) {
      schema.lines.push(line);
      if (line.endsWith(";")) schema = null;
      continue;
    }
    const insert = line.match(/^INSERT INTO \x60([^\x60]+)\x60/);
    if (insert) {
      const t = tables.get(insert[1]);
      if (!t) throw Error("Insert has no table schema");
      t.rows.push(line);
    }
  }
  return [...tables.values()]
    .map((t) => ({
      table: t.name,
      rows: t.rows.length,
      schemaHash: createHash("sha256")
        .update(t.lines.join("\n").replace(/AUTO_INCREMENT=\d+\s*/gi, ""))
        .digest("hex"),
      dataHash: createHash("sha256").update(t.rows.sort().join("\n")).digest("hex")
    }))
    .sort((a, b) => a.table.localeCompare(b.table));
}
const results = [];
const reportPath = join(root, "manifest.json");
try {
  for (const entry of entries) {
    const localName = prefix + (entry.scope === "master" ? "master" : entry.code.toLowerCase());
    if (localName.length > 64) throw Error("Local name too long");
    const sqlPath = join(root, entry.database + ".sql");
    const verifyPath = join(root, entry.database + ".verify.sql");
    console.log("Reading VPS " + entry.database + " ...");
    const remote =
      "docker exec cxapp-mariadb sh -c " +
      '\'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" exec mariadb-dump --no-defaults -uroot ' +
      dumpFlags.join(" ") +
      ' "$1"\' dump ' +
      entry.database;
    const dump = start("ssh", [...sshArgs, remote]);
    dump.p.stdin.end();
    await Promise.all([
      pipeline(dump.p.stdout, createWriteStream(sqlPath, { flags: "wx", mode: 0o600 })),
      dump.done
    ]);
    const sql = await fs.readFile(sqlPath, "utf8");
    if (/^USE |^CREATE DATABASE /m.test(sql))
      throw Error("Unexpected database-switching directive");
    if (/REFERENCES \x60[^\x60]+\x60\./i.test(sql))
      throw Error("Cross-database foreign key needs explicit remapping");
    const expected = digest(sql);
    if (!expected.length) throw Error("No tables in source dump");
    await c.query(
      "CREATE DATABASE " + quote(localName) + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
    const restore = start(
      localBin + "mariadb.exe",
      [
        "--no-defaults",
        "--host=127.0.0.1",
        "--port=3306",
        "--user=" + env.DB_USER,
        "--binary-mode",
        "--skip-reconnect",
        "--default-character-set=utf8mb4",
        localName
      ],
      { env: localEnv }
    );
    restore.p.stdout.resume();
    await Promise.all([pipeline(createReadStream(sqlPath), restore.p.stdin), restore.done]);
    const verify = start(
      localBin + "mariadb-dump.exe",
      ["--host=127.0.0.1", "--port=3306", "--user=" + env.DB_USER, ...dumpFlags, localName],
      { env: localEnv }
    );
    verify.p.stdin.end();
    await Promise.all([
      pipeline(verify.p.stdout, createWriteStream(verifyPath, { flags: "wx", mode: 0o600 })),
      verify.done
    ]);
    const actual = digest(await fs.readFile(verifyPath, "utf8"));
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      await fs.writeFile(
        join(root, entry.database + ".comparison.json"),
        JSON.stringify({ expected, actual }, null, 2)
      );
      throw Error("Verification mismatch for " + entry.database + "; comparison saved locally");
    }
    await fs.unlink(verifyPath);
    const result = {
      ...entry,
      localDatabase: localName,
      backupFile: sqlPath,
      backupSha256: createHash("sha256").update(sql).digest("hex"),
      bytes: Buffer.byteLength(sql),
      tableCount: expected.length,
      rowCount: expected.reduce((n, t) => n + t.rows, 0),
      tables: expected,
      verified: true
    };
    results.push(result);
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          vps: "69.62.81.166",
          createdAt: stamp,
          localHost: "127.0.0.1:3306",
          remoteWrites: false,
          results,
          status: "in-progress"
        },
        null,
        2
      )
    );
    console.log(
      "Verified " +
        entry.database +
        " -> " +
        localName +
        ": " +
        result.tableCount +
        " tables, " +
        result.rowCount +
        " rows"
    );
  }
  const master = results.find((r) => r.scope === "master");
  for (const tenant of results.filter((r) => r.scope === "tenant")) {
    await c.execute(
      "UPDATE " +
        quote(master.localDatabase) +
        ".tenants SET db_host=?,db_port=?,db_name=?,db_user=?,db_secret_ref=? WHERE tenant_code=?",
      ["127.0.0.1", 3306, tenant.localDatabase, env.DB_USER, "DB_PASSWORD", tenant.code]
    );
  }
  const [mapped] = await c.query(
    "SELECT tenant_code,db_host,db_port,db_name,db_secret_ref FROM " +
      quote(master.localDatabase) +
      ".tenants ORDER BY id"
  );
  if (
    mapped.length !== inventory.length ||
    mapped.some(
      (t) =>
        t.db_host !== "127.0.0.1" ||
        Number(t.db_port) !== 3306 ||
        !t.db_name.startsWith(prefix) ||
        t.db_secret_ref !== "DB_PASSWORD"
    )
  )
    throw Error("Cloned master local mapping validation failed");
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        vps: "69.62.81.166",
        createdAt: stamp,
        localHost: "127.0.0.1:3306",
        remoteWrites: false,
        status: "complete",
        masterLocalDatabase: master.localDatabase,
        tenantMappings: mapped,
        masterTransformation:
          "After exact snapshot verification, only cloned tenants connection fields were remapped to local databases. All tenant data retained.",
        results
      },
      null,
      2
    )
  );
  await fs.writeFile(
    join(root, "LOCAL-TESTING.txt"),
    "Local master: " +
      master.localDatabase +
      "\nSet DB_MASTER_NAME to this name in a separate local testing environment, using the existing local DB_USER and DB_PASSWORD. Do not use the cloud app credentials. All cloned tenant connections point to this local MariaDB instance. Your running local app configuration has not been switched. Native SQL backups contain sensitive production data; keep this ignored storage folder private.\n"
  );
  console.log(
    "COMPLETE " +
      JSON.stringify({
        folder: root,
        master: master.localDatabase,
        databases: results.length,
        tables: results.reduce((n, r) => n + r.tableCount, 0),
        rows: results.reduce((n, r) => n + r.rowCount, 0),
        remoteWrites: false
      })
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
