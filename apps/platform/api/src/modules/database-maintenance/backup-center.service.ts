import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, realpath } from "node:fs/promises";
import { resolve, join, relative, isAbsolute } from "node:path";
import { createConnection } from "mysql2/promise";
import { z } from "zod";
import { env } from "../../env.js";
import { TenantRepository } from "../tenant/tenant.repository.js";
import { resolveTenantDatabasePassword } from "../../database/tenant-database.js";
import { createSqlDump } from "./database-maintenance.executor.js";
import { checksum, restoreStatements, sandboxName } from "./backup-policy.js";

const profileSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  user: z.string().min(1),
  passwordEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  masterDatabase: z.string().regex(/^[a-zA-Z0-9_]+$/),
  tenantDatabases: z.record(z.string(), z.string().regex(/^[a-zA-Z0-9_]+$/)).default({}),
  allowRestore: z.boolean().default(false),
  allowExistingRestore: z.boolean().default(false),
  restoreTargets: z
    .record(z.string(), z.array(z.string().regex(/^[a-zA-Z0-9_]{1,64}$/)))
    .default({})
});
const artifactSchema = z.object({
  format: z.literal("cxapp-tables-v1"),
  id: z.string().uuid(),
  scope: z.enum(["master", "tenant"]),
  tenantCode: z.string(),
  databaseName: z.string(),
  profileId: z.string(),
  createdAt: z.string(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  sql: z.string().max(32 * 1024 * 1024)
});
export type BackupArtifact = z.infer<typeof artifactSchema>;
const tenants = new TenantRepository();
function profiles() {
  const extra = z
    .array(profileSchema)
    .parse(JSON.parse(process.env.CXAPP_BACKUP_CONNECTIONS || "[]"));
  if (
    new Set(extra.map((p) => p.id)).size !== extra.length ||
    extra.some((p) => p.id === "configured")
  )
    throw new Error("Backup connection IDs must be unique; configured is reserved.");
  const resolved = extra.map((p) => {
    const password = process.env[p.passwordEnv];
    if (password === undefined)
      throw new Error("A backup connection password environment variable is missing.");
    return { ...p, password };
  });
  return [
    {
      id: "configured",
      label: "Application database",
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      masterDatabase: env.DB_MASTER_NAME,
      tenantDatabases: {} as Record<string, string>,
      allowExistingRestore: false,
      restoreTargets: {} as Record<string, string[]>,
      allowRestore: false
    },
    ...resolved
  ];
}
function locations() {
  const items = z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        label: z.string().min(1),
        path: z.string().min(1)
      })
    )
    .min(1)
    .parse(
      JSON.parse(
        process.env.CXAPP_BACKUP_LOCATIONS ||
          JSON.stringify([
            { id: "default", label: "Server backup folder", path: env.CXAPP_BACKUP_DIR }
          ])
      )
    );
  if (new Set(items.map((p) => p.id)).size !== items.length)
    throw new Error("Backup location IDs must be unique.");
  return items.map((p) => ({ ...p, path: resolve(p.path) }));
}
async function folder(id: string) {
  const location = locations().find((x) => x.id === id);
  if (!location) throw new Error("Unknown backup location.");
  await mkdir(location.path, { recursive: true, mode: 0o700 });
  return realpath(location.path);
}
async function file(locationId: string, id: string) {
  z.string().uuid().parse(id);
  const root = await folder(locationId);
  const p = join(root, id + ".cxbackup");
  try {
    const actual = await realpath(p);
    const rel = relative(root, actual);
    if (rel.startsWith("..") || isAbsolute(rel))
      throw new Error("Backup path escapes configured location.");
    return actual;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return p;
    throw e;
  }
}
function publicArtifact(a: BackupArtifact) {
  const { sql, ...metadata } = a;
  return { ...metadata, sizeBytes: Buffer.byteLength(sql) };
}
export async function backupConfiguration() {
  const records = await tenants.list();
  return {
    profiles: profiles().map((p) => ({
      id: p.id,
      label: p.label,
      host: p.host,
      port: p.port,
      masterDatabase: p.masterDatabase,
      tenantDatabases: p.tenantDatabases,
      allowExistingRestore: p.allowExistingRestore,
      restoreTargets: p.restoreTargets,
      allowRestore: p.allowRestore && process.env.CXAPP_BACKUP_RESTORE_ENABLED === "1"
    })),
    locations: locations(),
    tenants: records.map((t) => ({
      id: t.id,
      code: t.tenantCode,
      name: t.tenantName,
      databaseName: t.dbName
    })),
    format: "Table schema and rows; views, routines, triggers and events are not included."
  };
}
export async function backupList(locationId: string, scope: string, tenantCode: string) {
  const dir = await folder(locationId);
  const result = [];
  for (const name of await readdir(dir)) {
    if (!/^[a-f0-9-]{36}\.cxbackup$/.test(name)) continue;
    try {
      const a = artifactSchema.parse(
        JSON.parse(await readFile(await file(locationId, name.slice(0, -9)), "utf8"))
      );
      if (a.scope === scope && (scope === "master" || a.tenantCode === tenantCode))
        result.push(publicArtifact(a));
    } catch {
      /* An incomplete or foreign artifact is not a usable backup. */
    }
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function backupExport(input: {
  profileId: string;
  locationId: string;
  scope: "master" | "tenant";
  tenantId?: number | undefined;
  downloadOnly?: boolean | undefined;
}) {
  const profile = profiles().find((x) => x.id === input.profileId);
  if (!profile) throw new Error("Unknown source connection.");
  const tenant =
    input.scope === "tenant" ? await tenants.findByIdOrCode(String(input.tenantId)) : null;
  if (input.scope === "tenant" && !tenant) throw new Error("Select a valid tenant.");
  const databaseName = tenant
    ? profile.id === "configured"
      ? tenant.dbName
      : profile.tenantDatabases[tenant.tenantCode]
    : profile.masterDatabase;
  if (!databaseName)
    throw new Error("This connection has no database mapping for the selected tenant.");
  const sql = await createSqlDump({
    databaseName,
    host: tenant && profile.id === "configured" ? tenant.dbHost || profile.host : profile.host,
    port: tenant && profile.id === "configured" ? tenant.dbPort || profile.port : profile.port,
    user: tenant && profile.id === "configured" ? tenant.dbUser || profile.user : profile.user,
    password:
      tenant && profile.id === "configured"
        ? resolveTenantDatabasePassword(tenant)
        : profile.password
  });
  if (Buffer.byteLength(sql) > 32 * 1024 * 1024)
    throw new Error(
      "Backup exceeds the 32 MiB interactive transfer limit. Use native MariaDB tooling for larger databases."
    );
  restoreStatements(sql);
  const artifact: BackupArtifact = {
    format: "cxapp-tables-v1",
    id: randomUUID(),
    scope: input.scope,
    tenantCode: tenant?.tenantCode || "",
    databaseName,
    profileId: profile.id,
    createdAt: new Date().toISOString(),
    checksum: checksum(sql),
    sql
  };
  if (input.downloadOnly) return artifact;
  await writeFile(await file(input.locationId, artifact.id), JSON.stringify(artifact), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  return publicArtifact(artifact);
}
export async function backupDownload(locationId: string, id: string) {
  return artifactSchema.parse(JSON.parse(await readFile(await file(locationId, id), "utf8")));
}
export async function backupUpload(
  locationId: string,
  payload: unknown,
  expected?: { scope?: "master" | "tenant" | undefined; tenantCode?: string | undefined }
) {
  const artifact = artifactSchema.parse(payload);
  if (
    expected?.scope &&
    (artifact.scope !== expected.scope ||
      (expected.scope === "tenant" &&
        (!expected.tenantCode || artifact.tenantCode !== expected.tenantCode)))
  )
    throw new Error("This backup does not belong to the selected tenant and scope.");
  if (checksum(artifact.sql) !== artifact.checksum) throw new Error("Backup checksum mismatch.");
  restoreStatements(artifact.sql);
  const copy = { ...artifact, id: randomUUID() };
  await writeFile(await file(locationId, copy.id), JSON.stringify(copy), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  return publicArtifact(copy);
}
export async function backupRestore(input: {
  locationId: string;
  id: string;
  profileId: string;
  databaseName: string;
  confirmation: string;
  mode?: "new" | "fresh" | "incremental" | undefined;
  scope: "master" | "tenant";
  tenantCode: string;
}) {
  const profile = profiles().find((x) => x.id === input.profileId);
  if (!profile?.allowRestore || process.env.CXAPP_BACKUP_RESTORE_ENABLED !== "1")
    throw new Error(
      "This destination is read only. Restore must be explicitly enabled on the server."
    );
  const mode = input.mode || "new";
  const databaseName = mode === "new" ? sandboxName(input.databaseName) : input.databaseName;
  const expected =
    (mode === "fresh" ? "FRESH RESTORE " : mode === "incremental" ? "MERGE RESTORE " : "RESTORE ") +
    databaseName;
  if (mode !== "new") {
    const mapped =
      input.scope === "master" ? profile.masterDatabase : profile.tenantDatabases[input.tenantCode];
    const targets =
      profile.restoreTargets[input.scope === "master" ? "master" : input.tenantCode] || [];
    if (!profile.allowExistingRestore)
      throw new Error("Existing restores are disabled for this destination connection.");
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(databaseName))
      throw new Error("Invalid database name. Use up to 64 letters, numbers or underscores.");
    if (
      ["mysql", "information_schema", "performance_schema", "sys"].includes(
        databaseName.toLowerCase()
      )
    )
      throw new Error("System databases cannot be restore targets.");
    if (databaseName !== mapped && !targets.includes(databaseName))
      throw new Error(
        "Database " +
          databaseName +
          " is not an allowed " +
          input.scope +
          " restore target on " +
          profile.label +
          ". Choose an allowed target or add it to this connection's restoreTargets settings."
      );
  }
  if (input.confirmation !== expected) throw new Error("The restore confirmation does not match.");
  const artifact = await backupDownload(input.locationId, input.id);
  if (artifact.scope !== input.scope || artifact.tenantCode !== input.tenantCode)
    throw new Error("Backup does not belong to this scope and tenant.");
  if (checksum(artifact.sql) !== artifact.checksum) throw new Error("Backup checksum mismatch.");
  const commands = restoreStatements(artifact.sql);
  const connection = await createConnection({
    host: profile.host,
    port: profile.port,
    user: profile.user,
    password: profile.password,
    multipleStatements: false
  });
  try {
    if (mode !== "new") {
      const { restoreExisting } = await import("./backup-existing-restore.js");
      return await restoreExisting({
        connection,
        commands,
        databaseName,
        mode,
        safetyBackup: async () => {
          const sql = await createSqlDump({
            databaseName,
            host: profile.host,
            port: profile.port,
            user: profile.user,
            password: profile.password
          });
          const before: BackupArtifact = {
            format: "cxapp-tables-v1",
            id: randomUUID(),
            scope: input.scope,
            tenantCode: input.tenantCode,
            databaseName,
            profileId: profile.id,
            createdAt: new Date().toISOString(),
            checksum: checksum(sql),
            sql
          };
          await writeFile(await file(input.locationId, before.id), JSON.stringify(before), {
            encoding: "utf8",
            flag: "wx",
            mode: 0o600
          });
          return before.id;
        }
      });
    }
    // No IF NOT EXISTS: an existing database can never be overwritten here.
    await connection.query(
      "CREATE DATABASE " +
        "\u0060" +
        databaseName +
        "\u0060 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
    await connection.changeUser({ database: databaseName });
    for (const command of commands) await connection.query(command);
    const [rows] = await connection.query("SHOW TABLES");
    return {
      databaseName,
      profileId: profile.id,
      tableCount: Array.isArray(rows) ? rows.length : 0,
      restoredAt: new Date().toISOString(),
      checksum: artifact.checksum
    };
  } finally {
    await connection.end();
  }
}
