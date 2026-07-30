import { AsyncLocalStorage } from "node:async_hooks";
import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool, type PoolOptions } from "mysql2";
import { createConnection } from "mysql2/promise";
import { seedCoreTenantPermissions } from "../auth/tenant-permission.seed.js";
import { env } from "../env.js";
import { commonMigrationSteps, migrateCommonModule } from "../modules/common/common.migration.js";
import { seedCommonModule } from "../modules/common/common.seed.js";
import { removeUnknownCountrySeed } from "../modules/common/location/country/index.js";
import { migrateMasterModule, seedMasterModule } from "../modules/master/index.js";
import { masterMigrationSteps } from "../modules/master/master.migration.js";
import {
  migrateOrganisationModule,
  seedOrganisationModule
} from "../modules/organisation/index.js";
import { organisationMigrationSteps } from "../modules/organisation/organisation.migration.js";

export type CoreDatabase = Record<string, unknown>;

const context = new AsyncLocalStorage<string>();
type CoreConnectionEntry = { database: Kysely<CoreDatabase>; lastUsedAt: number };

const connections = new Map<string, CoreConnectionEntry>();
const migrated = new Set<string>();
const bootstrapping = new Map<string, Promise<void>>();
const connectionIdleMs = 10 * 60 * 1000;
const evictionTimer = setInterval(() => void evictIdleCoreDatabases(), 60_000);
evictionTimer.unref();

export const coreTenantMigrations = [
  {
    description: "Flatten legacy Core table names before module-owned migrations.",
    name: "003_flatten_core_table_names"
  },
  ...commonMigrationSteps.map(({ description, key }) => ({ description, name: key })),
  ...organisationMigrationSteps.map(({ description, key }) => ({ description, name: key })),
  ...masterMigrationSteps.map(({ description, key }) => ({ description, name: key }))
] as const;

export function resolveCoreDatabaseName(value: unknown) {
  const requested = typeof value === "string" ? value.trim() : "";
  if (!requested) throw new Error("x-tenant-db is required for Core database access.");
  if (!/^[a-zA-Z0-9_]+$/.test(requested)) throw new Error("Invalid tenant database name.");
  if (requested === env.DB_MASTER_NAME)
    throw new Error("Core tables cannot use the Platform master database.");
  return requested;
}

export function runWithCoreDatabase<T>(databaseName: string, callback: () => T) {
  return context.run(resolveCoreDatabaseName(databaseName), callback);
}

export function getCoreDatabase(databaseName = context.getStore()) {
  const name = resolveCoreDatabaseName(databaseName);
  const existing = connections.get(name);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing.database;
  }
  const database = new Kysely<CoreDatabase>({
    dialect: new MysqlDialect({
      pool: createPool({
        database: name,
        host: env.DB_HOST,
        password: env.DB_PASSWORD,
        port: env.DB_PORT,
        connectionLimit: 4,
        idleTimeout: 60_000,
        maxIdle: 1,
        queueLimit: 100,
        timezone: "Z",
        user: env.DB_USER
      } satisfies PoolOptions)
    })
  });
  connections.set(name, { database, lastUsedAt: Date.now() });
  return database;
}

export async function bootstrapCoreDatabase(databaseName: string) {
  const name = resolveCoreDatabaseName(databaseName);
  if (migrated.has(name)) return;
  const active = bootstrapping.get(name);
  if (active) return active;
  const promise = runWithCoreDatabase(name, async () => {
    await ensureDatabase(name);
    const database = getCoreDatabase(name);
    await migrateCoreModules(database);
    await seedCoreModules(database);
    migrated.add(name);
  });
  bootstrapping.set(name, promise);
  try {
    await promise;
  } finally {
    bootstrapping.delete(name);
  }
}

export async function migrateCoreTenantDatabase(databaseName: string) {
  const name = resolveCoreDatabaseName(databaseName);
  const active = bootstrapping.get(name);
  if (active) await active.catch(() => undefined);
  await closeCoreDatabaseConnection(name);
  migrated.delete(name);
  await runWithCoreDatabase(name, async () => {
    await ensureDatabase(name);
    await migrateCoreModules(getCoreDatabase(name));
  });
}

export async function seedCoreTenantDatabase(databaseName: string) {
  const name = resolveCoreDatabaseName(databaseName);
  await runWithCoreDatabase(name, async () => {
    await ensureDatabase(name);
    const database = getCoreDatabase(name);
    await migrateCoreModules(database);
    await seedCoreModules(database);
    migrated.add(name);
  });
}

async function recordCoreMigration(database: Kysely<CoreDatabase>, name: string) {
  await sql`INSERT IGNORE INTO schema_migrations (name) VALUES (${name})`.execute(database);
}

async function migrateCoreModules(database: Kysely<CoreDatabase>) {
  await flattenLegacyCoreTableNames(database);
  await migrateCommonModule(database);
  for (const step of commonMigrationSteps) await recordCoreMigration(database, step.key);
  await migrateOrganisationModule(database);
  for (const step of organisationMigrationSteps) await recordCoreMigration(database, step.key);
  await migrateMasterModule(database);
  for (const step of masterMigrationSteps) await recordCoreMigration(database, step.key);
}

async function seedCoreModules(database: Kysely<CoreDatabase>) {
  // Seed dependency order mirrors the schema dependency order: shared lookup
  // records first, tenant organisation defaults second, transactional masters last.
  await seedCommonModule();
  await seedOrganisationModule();
  await seedMasterModule();
  await removeUnknownCountrySeed();
  await seedCoreTenantPermissions(database as unknown as Kysely<unknown>);
}

async function flattenLegacyCoreTableNames(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      "CREATE TABLE IF NOT EXISTS schema_migrations (" +
        "id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL UNIQUE, " +
        "applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)"
    )
    .execute(database);
  const result = await sql<{ table_name: string }>`
    SELECT TABLE_NAME AS table_name
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'core\_%'
    ORDER BY TABLE_NAME
  `.execute(database);

  for (const { table_name: legacyName } of result.rows) {
    const currentName = legacyName
      .replace(/^core_common_/, "")
      .replace(/^core_master_/, "")
      .replace(/^core_/, "");
    const existing = await sql<{ table_count: number | string }>`
      SELECT COUNT(*) AS table_count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${currentName}
    `.execute(database);
    if (Number(existing.rows[0]?.table_count ?? 0) > 0) {
      throw new Error(`Cannot flatten Core table ${legacyName}: ${currentName} already exists.`);
    }
    await sql.raw(`RENAME TABLE \`${legacyName}\` TO \`${currentName}\``).execute(database);
  }

  await sql`INSERT IGNORE INTO schema_migrations (name) VALUES ('003_flatten_core_table_names')`.execute(
    database
  );
}

export async function bootstrapRegisteredCoreDatabases() {
  const databaseNames = await registeredTenantDatabaseNames();
  await Promise.all(databaseNames.map((databaseName) => bootstrapCoreDatabase(databaseName)));
}

export async function closeCoreDatabase() {
  const open = Array.from(connections.values(), (entry) => entry.database);
  connections.clear();
  migrated.clear();
  await Promise.all(open.map((database) => database.destroy()));
}

async function closeCoreDatabaseConnection(name: string) {
  const entry = connections.get(name);
  if (!entry) return;
  connections.delete(name);
  await entry.database.destroy();
}

export async function evictIdleCoreDatabases(now = Date.now()) {
  const idle = Array.from(connections.entries()).filter(
    ([name, entry]) => now - entry.lastUsedAt >= connectionIdleMs && !bootstrapping.has(name)
  );
  for (const [name, entry] of idle) {
    if (connections.get(name) !== entry) continue;
    connections.delete(name);
    await entry.database.destroy();
  }
  return idle.length;
}

async function ensureDatabase(databaseName: string) {
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    timezone: "Z",
    user: env.DB_USER
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

async function registeredTenantDatabaseNames() {
  const connection = await createConnection({
    database: env.DB_MASTER_NAME,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    timezone: "Z",
    user: env.DB_USER
  });
  try {
    const [rows] = await connection.query(
      "SELECT db_name FROM tenants WHERE db_name IS NOT NULL AND status <> 'deleted'"
    );
    return (rows as Array<{ db_name: string }>).map(({ db_name }) =>
      resolveCoreDatabaseName(db_name)
    );
  } finally {
    await connection.end();
  }
}
