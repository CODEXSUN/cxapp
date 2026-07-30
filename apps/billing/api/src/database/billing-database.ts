import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool, type PoolOptions } from "mysql2";
import { createConnection } from "mysql2/promise";
import { AppError } from "@codexsun/framework/errors";
import { seedBillingTenantPermissions } from "../auth/tenant-permission.seed.js";
import { env } from "../env.js";
import {
  migrateQuotationModule,
  quotationMigration
} from "../modules/quotation/quotation.migration.js";
import { seedQuotationModule } from "../modules/quotation/quotation.seed.js";
import {
  exportSalesMigration,
  migrateExportSalesModule
} from "../modules/export-sales/export-sales.migration.js";
import { seedExportSalesModule } from "../modules/export-sales/export-sales.seed.js";
import { migratePaymentModule, paymentMigration } from "../modules/payment/payment.migration.js";
import { seedPaymentModule } from "../modules/payment/payment.seed.js";
import {
  migratePurchaseModule,
  purchaseMigration
} from "../modules/purchase/purchase.migration.js";
import { seedPurchaseModule } from "../modules/purchase/purchase.seed.js";
import { migrateSalesModule, salesMigration } from "../modules/sales/sales.migration.js";
import { migrateReceiptModule, receiptMigration } from "../modules/receipt/receipt.migration.js";
import { seedReceiptModule } from "../modules/receipt/receipt.seed.js";
import { seedSalesModule } from "../modules/sales/sales.seed.js";
import {
  billingSettingsMigration,
  migrateBillingSettingsModule
} from "../modules/settings/settings.migration.js";
import { seedBillingSettingsModule } from "../modules/settings/settings.seed.js";
import { BillingSettingsRepository } from "../modules/settings/settings.repository.js";
import {
  dashboardMigration,
  migrateDashboardModule
} from "../modules/dashboard/dashboard.migration.js";
import { seedDashboardModule } from "../modules/dashboard/dashboard.seed.js";

export type BillingDatabase = {
  billing_quotations: BillingQuotationTable;
  billing_sales: BillingSalesTable;
};

export type BillingQuotationTable = {
  amount: number;
  billing_address_id: number;
  company_id: number;
  currency_id: number;
  customer_id: number;
  financial_year_id: number;
  id: number;
  quotation_date: string;
  quotation_number: string;
  line_number: number;
  shipping_address_id: number;
  status: "draft" | "confirmed" | "cancelled";
  uuid: string;
};

export type BillingSalesTable = {
  amount: number;
  billing_address_id: number;
  company_id: number;
  currency_id: number;
  customer_id: number;
  financial_year_id: number;
  id: number;
  invoice_number: string;
  issued_on: string;
  line_number: number;
  shipping_address_id: number;
  status: "draft" | "confirmed" | "cancelled";
  uuid: string;
};

type BillingConnectionEntry = { database: Kysely<BillingDatabase>; lastUsedAt: number };

const connections = new Map<string, BillingConnectionEntry>();
const migrated = new Set<string>();
const bootstrapping = new Map<string, Promise<void>>();
const bootstrapTimeoutMs = 5_000;
const connectionIdleMs = 10 * 60 * 1000;
const evictionTimer = setInterval(() => void evictIdleBillingDatabases(), 60_000);
evictionTimer.unref();

const billingMigrationSteps = [
  {
    description: "Company-owned Billing settings.",
    key: billingSettingsMigration.key,
    migrate: migrateBillingSettingsModule
  },
  {
    description: "Billing sales documents and relational line items.",
    key: salesMigration.key,
    migrate: migrateSalesModule
  },
  {
    description: "Billing purchase documents and relational line items.",
    key: purchaseMigration.key,
    migrate: migratePurchaseModule
  },
  {
    description: "Billing export-sales documents and relational line items.",
    key: exportSalesMigration.key,
    migrate: migrateExportSalesModule
  },
  {
    description: "Billing quotations and relational line items.",
    key: quotationMigration.key,
    migrate: migrateQuotationModule
  },
  {
    description: "Billing payment documents.",
    key: paymentMigration.key,
    migrate: migratePaymentModule
  },
  {
    description: "Billing receipt documents.",
    key: receiptMigration.key,
    migrate: migrateReceiptModule
  },
  {
    description: "Billing dashboard snapshots.",
    key: dashboardMigration.key,
    migrate: migrateDashboardModule
  }
] as const;

export const billingTenantMigrations = billingMigrationSteps.map(({ description, key }) => ({
  description,
  name: key
}));

export function resolveBillingDatabaseName(value: unknown) {
  const requested = typeof value === "string" ? value.trim() : "";
  if (!requested) throw AppError.validation("x-tenant-db is required for Billing database access.");
  if (!/^[a-zA-Z0-9_]+$/.test(requested))
    throw AppError.validation("Invalid tenant database name.");
  const name = requested;
  if (name === env.DB_MASTER_NAME)
    throw AppError.validation("Billing tables cannot use the Platform master database.");
  return name;
}

export async function getBillingDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  await bootstrapBillingDatabase(name);
  return openBillingDatabase(name);
}

export async function bootstrapBillingDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  if (migrated.has(name)) {
    return;
  }

  const activeBootstrap = bootstrapping.get(name);
  if (activeBootstrap) {
    await withTimeout(
      activeBootstrap,
      bootstrapTimeoutMs,
      `Billing database bootstrap timed out after ${bootstrapTimeoutMs}ms for ${name}`
    );
    return;
  }

  const bootstrapPromise = bootstrapBillingDatabaseOnce(name);
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
    `Billing database bootstrap timed out after ${bootstrapTimeoutMs}ms for ${name}`
  );
}

export async function migrateBillingTenantDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  const active = bootstrapping.get(name);
  if (active) await active.catch(() => undefined);
  await closeBillingDatabaseConnection(name);
  migrated.delete(name);
  await ensureDatabase(name);
  await migrateBillingModules(openBillingDatabase(name));
}

export async function seedBillingTenantDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  await ensureDatabase(name);
  const database = openBillingDatabase(name);
  await migrateBillingModules(database);
  migrated.add(name);
  try {
    await seedBillingModules(database, name);
  } catch (error) {
    migrated.delete(name);
    throw error;
  }
}

async function bootstrapBillingDatabaseOnce(name: string) {
  await ensureDatabase(name);
  const db = openBillingDatabase(name);
  await migrateBillingModules(db);
  migrated.add(name);
  try {
    await seedBillingModules(db, name);
  } catch (error) {
    migrated.delete(name);
    throw error;
  }
}

async function migrateBillingModules(database: Kysely<BillingDatabase>) {
  for (const step of billingMigrationSteps) {
    await step.migrate(database);
    await recordBillingMigration(database, step.key);
  }
}

async function seedBillingModules(database: Kysely<BillingDatabase>, databaseName: string) {
  await seedBillingTenantPermissions(database as unknown as Kysely<unknown>);
  await seedBillingSettingsModule();
  const settingsRepository = new BillingSettingsRepository();
  const companyId = await settingsRepository.defaultCompanyId(databaseName);
  await settingsRepository.getBillingSettings(databaseName, companyId);
  await seedSalesModule(database);
  await seedPurchaseModule();
  await seedExportSalesModule(database);
  await seedQuotationModule();
  await seedPaymentModule(database);
  await seedReceiptModule(database);
  await seedDashboardModule(databaseName);
}

async function recordBillingMigration(database: Kysely<BillingDatabase>, name: string) {
  await sql`INSERT IGNORE INTO schema_migrations (name) VALUES (${name})`.execute(database);
}

export async function bootstrapRegisteredBillingDatabases() {
  const databaseNames = await registeredTenantDatabaseNames();
  await Promise.all(databaseNames.map((databaseName) => bootstrapBillingDatabase(databaseName)));
}

function openBillingDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  const existing = connections.get(name);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing.database;
  }

  const db = new Kysely<BillingDatabase>({
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
        user: env.DB_USER,
        connectTimeout: 5_000
      } satisfies PoolOptions)
    })
  });
  connections.set(name, { database: db, lastUsedAt: Date.now() });
  return db;
}

async function ensureDatabase(databaseName: string) {
  const name = assertDatabaseName(databaseName);
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    timezone: "Z",
    user: env.DB_USER,
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
      resolveBillingDatabaseName(db_name)
    );
  } finally {
    await connection.end();
  }
}

export async function closeAllBillingDatabases() {
  const openConnections = Array.from(connections.values(), (entry) => entry.database);
  connections.clear();
  migrated.clear();
  await Promise.all(openConnections.map(async (database) => database.destroy()));
}

async function closeBillingDatabaseConnection(name: string) {
  const entry = connections.get(name);
  if (!entry) return;
  connections.delete(name);
  await entry.database.destroy();
}

export async function evictIdleBillingDatabases(now = Date.now()) {
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
