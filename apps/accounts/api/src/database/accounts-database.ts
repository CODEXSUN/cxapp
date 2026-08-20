import {
  ensureStandardTableColumns,
  rollbackMigrationBatch,
  runMigrationBatch,
  type MigrationBatch
} from "@cxapp/framework/db";
import { Kysely, MysqlDialect } from "kysely";
import { createPool, type PoolOptions } from "mysql2";
import { createConnection } from "mysql2/promise";
import { AppError } from "@cxapp/framework/errors";
import { env } from "../env.js";
import {
  accountingCashBookLinesMigration,
  accountingMigration,
  accountingBooksMigration,
  accountingCentralEntriesMigration,
  accountingCoreLedgerLinksMigration,
  migrateAccountingModule,
  migrateAccountingBooksModule,
  migrateAccountingCentralEntriesModule,
  migrateAccountingCashBookLinesModule,
  migrateAccountingCoreLedgerLinksModule
} from "../modules/accounting/accounting.migration.js";
import { seedAccountingModule } from "../modules/accounting/accounting.seed.js";

export type AccountsDatabase = {
  acc_accounts: {
    account_type: "asset" | "liability" | "equity" | "income" | "expense";
    code: string;
    company_id: number;
    financial_year_id: number;
    id: number;
    name: string;
    normal_balance: "debit" | "credit";
    status: string;
    uuid: string;
  };
  acc_journal_entries: {
    company_id: number;
    entry_number: string;
    financial_year_id: number;
    id: number;
    status: string;
    uuid: string;
  };
};

type AccountsConnectionEntry = { database: Kysely<AccountsDatabase>; lastUsedAt: number };

const connections = new Map<string, AccountsConnectionEntry>();
const tenantConnectionOptions = new Map<string, TenantConnectionOptions>();
const migrated = new Set<string>();
const bootstrapping = new Map<string, Promise<void>>();
const bootstrapTimeoutMs = 5_000;
const connectionIdleMs = 10 * 60 * 1000;
const evictionTimer = setInterval(() => void evictIdleAccountsDatabases(), 60_000);
evictionTimer.unref();

const accountingMigrationSteps = [
  {
    description: accountingMigration.description,
    key: accountingMigration.key,
    migrate: migrateAccountingModule
  },
  {
    description: accountingBooksMigration.description,
    key: accountingBooksMigration.key,
    migrate: migrateAccountingBooksModule
  },
  {
    description: accountingCentralEntriesMigration.description,
    key: accountingCentralEntriesMigration.key,
    migrate: migrateAccountingCentralEntriesModule
  },
  {
    description: accountingCoreLedgerLinksMigration.description,
    key: accountingCoreLedgerLinksMigration.key,
    migrate: migrateAccountingCoreLedgerLinksModule
  },
  {
    description: accountingCashBookLinesMigration.description,
    key: accountingCashBookLinesMigration.key,
    migrate: migrateAccountingCashBookLinesModule
  }
] as const;

const accountsTableNames = [
  "acc_accounts",
  "acc_account_groups",
  "acc_accounting_periods",
  "acc_accounting_rules",
  "acc_journal_entries",
  "acc_journal_lines",
  "acc_ledger"
] as const;

const centralAccountsTableNames = [
  "acc_entries",
  "acc_entry_lines",
  "acc_cash_entries",
  "acc_bank_entries"
] as const;

export const accountsMigrationBatch: MigrationBatch<AccountsDatabase> = {
  batch: 1,
  description: "Accounts module-owned schema baseline through release 1.0.64.",
  scope: "accounts",
  version: "1.0.64",
  steps: [
    ...accountingMigrationSteps.map(({ description, key, migrate }) => ({
      checksum: `${key}:v1`,
      description,
      name: key,
      up: migrate,
      version: 1
    })),
    {
      checksum: `standard-columns:${accountsTableNames.join(",")}`,
      description: "Backfill and validate standard Accounts table identity and audit columns.",
      name: "accounts.standard-columns-v1",
      up: (database) => ensureStandardTableColumns(database, accountsTableNames),
      version: 1
    },
    {
      checksum: `central-standard-columns:${centralAccountsTableNames.join(",")}`,
      description: "Validate standard identity and audit columns on centralized entry tables.",
      name: "accounts.central-standard-columns-v1",
      up: (database) => ensureStandardTableColumns(database, centralAccountsTableNames),
      version: 1
    }
  ]
};

export const accountsTenantMigrations = [
  ...accountingMigrationSteps.map(({ description, key }) => ({ description, name: key })),
  {
    description: "Backfill and validate standard Accounts table identity and audit columns.",
    name: "accounts.standard-columns-v1"
  },
  {
    description: "Validate standard identity and audit columns on centralized entry tables.",
    name: "accounts.central-standard-columns-v1"
  }
] as const;

export function resolveAccountsDatabaseName(value: unknown) {
  const requested = typeof value === "string" ? value.trim() : "";
  if (!requested)
    throw AppError.validation("x-tenant-db is required for Accounts database access.");
  if (!/^[a-zA-Z0-9_]+$/.test(requested))
    throw AppError.validation("Invalid tenant database name.");
  const name = requested;
  if (name === env.DB_MASTER_NAME)
    throw AppError.validation("Accounts tables cannot use the Platform master database.");
  return name;
}

export async function getAccountsDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  await bootstrapAccountsDatabase(name);
  return openAccountsDatabase(name);
}

export function registerAccountsTenantDatabaseConnection(input: TenantConnectionOptions) {
  const name = assertDatabaseName(input.database);
  tenantConnectionOptions.set(name, { ...input, database: name });
}

export async function bootstrapAccountsDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  if (migrated.has(name)) {
    return;
  }

  const activeBootstrap = bootstrapping.get(name);
  if (activeBootstrap) {
    await withTimeout(
      activeBootstrap,
      bootstrapTimeoutMs,
      `Accounts database bootstrap timed out after ${bootstrapTimeoutMs}ms for ${name}`
    );
    return;
  }

  const bootstrapPromise = bootstrapAccountsDatabaseOnce(name);
  bootstrapping.set(name, bootstrapPromise);
  void bootstrapPromise.then(
    () => {
      if (bootstrapping.get(name) === bootstrapPromise) bootstrapping.delete(name);
    },
    () => {
      if (bootstrapping.get(name) === bootstrapPromise) bootstrapping.delete(name);
    }
  );
  await withTimeout(
    bootstrapPromise,
    bootstrapTimeoutMs,
    `Accounts database bootstrap timed out after ${bootstrapTimeoutMs}ms for ${name}`
  );
}

export async function migrateAccountsTenantDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  const active = bootstrapping.get(name);
  if (active) await active.catch(() => undefined);
  await closeAccountsDatabaseConnection(name);
  migrated.delete(name);
  await ensureDatabase(name);
  await migrateAccountsModules(openAccountsDatabase(name));
}

export async function seedAccountsTenantDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  await ensureDatabase(name);
  const database = openAccountsDatabase(name);
  await migrateAccountsModules(database);
  migrated.add(name);
  try {
    await seedAccountingModule(database);
  } catch (error) {
    migrated.delete(name);
    throw error;
  }
}

async function bootstrapAccountsDatabaseOnce(name: string) {
  await ensureDatabase(name);
  const db = openAccountsDatabase(name);
  await migrateAccountsModules(db);
  migrated.add(name);
  try {
    await seedAccountingModule(db);
  } catch (error) {
    migrated.delete(name);
    throw error;
  }
}

async function migrateAccountsModules(database: Kysely<AccountsDatabase>) {
  await runMigrationBatch(database, accountsMigrationBatch, { batchSize: 5 });
}

export async function rollbackAccountsTenantDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  await ensureDatabase(name);
  return rollbackMigrationBatch(openAccountsDatabase(name), accountsMigrationBatch);
}

export async function bootstrapRegisteredAccountsDatabases() {
  const databaseNames = await registeredTenantDatabaseNames();
  await Promise.all(databaseNames.map((databaseName) => bootstrapAccountsDatabase(databaseName)));
}

function openAccountsDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  const existing = connections.get(name);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing.database;
  }

  const db = new Kysely<AccountsDatabase>({
    dialect: new MysqlDialect({
      pool: createPool({
        database: name,
        host: tenantConnectionOptions.get(name)?.host ?? env.DB_HOST,
        password: tenantConnectionOptions.get(name)?.password ?? env.DB_PASSWORD,
        port: tenantConnectionOptions.get(name)?.port ?? env.DB_PORT,
        connectionLimit: 4,
        idleTimeout: 60_000,
        maxIdle: 1,
        queueLimit: 100,
        timezone: "Z",
        user: tenantConnectionOptions.get(name)?.user ?? env.DB_USER,
        connectTimeout: 5_000
      } satisfies PoolOptions)
    })
  });
  connections.set(name, { database: db, lastUsedAt: Date.now() });
  return db;
}

async function ensureDatabase(databaseName: string) {
  const options = tenantConnectionOptions.get(databaseName);
  const name = assertDatabaseName(databaseName);
  const connection = await createConnection({
    host: options?.host ?? env.DB_HOST,
    password: options?.password ?? env.DB_PASSWORD,
    port: options?.port ?? env.DB_PORT,
    timezone: "Z",
    user: options?.user ?? env.DB_USER,
    connectTimeout: 5_000
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

type TenantConnectionOptions = {
  database: string;
  host: string;
  password: string;
  port: number;
  user: string;
};

async function registeredTenantDatabaseNames() {
  const connection = await createConnection({
    database: env.DB_MASTER_NAME,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    timezone: "Z",
    user: env.DB_USER,
    connectTimeout: 5_000
  });
  try {
    const [rows] = await connection.query(
      "SELECT db_name FROM tenants WHERE db_name IS NOT NULL AND status <> 'deleted'"
    );
    return (rows as Array<{ db_name: string }>).map(({ db_name }) =>
      resolveAccountsDatabaseName(db_name)
    );
  } finally {
    await connection.end();
  }
}

export async function closeAllAccountsDatabases() {
  const openConnections = Array.from(connections.values(), (entry) => entry.database);
  connections.clear();
  migrated.clear();
  await Promise.all(openConnections.map(async (database) => database.destroy()));
}

async function closeAccountsDatabaseConnection(name: string) {
  const entry = connections.get(name);
  if (!entry) return;
  connections.delete(name);
  await entry.database.destroy();
}

export async function evictIdleAccountsDatabases(now = Date.now()) {
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

function assertDatabaseName(value: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Invalid database name: ${value}`);
  }
  return value;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    timer.unref();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
