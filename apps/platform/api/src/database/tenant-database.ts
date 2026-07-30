import { Kysely, MysqlDialect } from "kysely";
import { createPool, type PoolOptions } from "mysql2";
import { createConnection } from "mysql2/promise";
import { env } from "../env.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { assertDatabaseName, quoteIdentifier } from "./database-utils.js";
import type { TenantDatabase } from "./schema.js";

const tenantConnections = new Map<string, Kysely<TenantDatabase>>();

export async function createTenantDatabase(target: string | Tenant) {
  const tenant = typeof target === "string" ? null : target;
  const name = assertDatabaseName(
    typeof target === "string" ? target : target.dbName,
    "tenant database name"
  );
  const host = tenant?.dbHost || env.DB_HOST;
  const port = tenant?.dbPort || env.DB_PORT;
  const user = tenant?.dbUser || env.DB_USER;
  console.info(`[database] ensuring tenant database "${name}" on ${host}:${port}`);
  const connection = await createConnection({
    host,
    password: tenant ? resolveTenantDatabasePassword(tenant) : env.DB_PASSWORD,
    port,
    user,
    timezone: "Z"
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.info(`[database] tenant database ready: "${name}"`);
  } finally {
    await connection.end();
  }
}

export function getTenantDatabase(tenant: Tenant) {
  const key = tenant.slug || tenant.dbName;
  const existing = tenantConnections.get(key);
  if (existing) {
    return existing;
  }

  const database = new Kysely<TenantDatabase>({
    dialect: new MysqlDialect({
      pool: createPool({
        database: assertDatabaseName(tenant.dbName, "tenant database name"),
        connectionLimit: 10,
        host: tenant.dbHost || env.DB_HOST,
        password: resolveTenantDatabasePassword(tenant),
        port: tenant.dbPort || env.DB_PORT,
        timezone: "Z",
        user: tenant.dbUser || env.DB_USER
      } satisfies PoolOptions)
    })
  });

  tenantConnections.set(key, database);
  return database;
}

export function resolveTenantDatabasePassword(tenant: Tenant) {
  return process.env[tenant.dbSecretRef] || env.DB_PASSWORD;
}

export function getTenantDatabaseByName(databaseName: string) {
  const name = assertDatabaseName(databaseName, "tenant database name");
  const existing = tenantConnections.get(name);
  if (existing) return existing;
  const database = new Kysely<TenantDatabase>({
    dialect: new MysqlDialect({
      pool: createPool({
        connectionLimit: 10,
        database: name,
        host: env.DB_HOST,
        password: env.DB_PASSWORD,
        port: env.DB_PORT,
        timezone: "Z",
        user: env.DB_USER
      } satisfies PoolOptions)
    })
  });
  tenantConnections.set(name, database);
  return database;
}

export async function closeTenantDatabase(tenant: Tenant) {
  const key = tenant.slug || tenant.dbName;
  const existing = tenantConnections.get(key);
  if (!existing) {
    return;
  }

  tenantConnections.delete(key);
  await existing.destroy();
}

export async function closeAllTenantDatabases() {
  const openConnections = Array.from(tenantConnections.values());
  tenantConnections.clear();
  await Promise.all(openConnections.map(async (database) => database.destroy()));
}

export async function dropTenantDatabase(tenant: Tenant) {
  await closeTenantDatabase(tenant);
  console.warn(
    `[database] dropping tenant database "${tenant.dbName}" for tenant "${tenant.tenantCode}"`
  );
  const connection = await createConnection({
    host: tenant.dbHost || env.DB_HOST,
    password: env.DB_PASSWORD,
    port: tenant.dbPort || env.DB_PORT,
    user: tenant.dbUser || env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(tenant.dbName)}`);
  } finally {
    await connection.end();
  }
}
