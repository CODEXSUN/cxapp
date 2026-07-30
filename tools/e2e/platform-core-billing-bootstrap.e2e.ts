import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createConnection, type RowDataPacket } from "mysql2/promise";

const runId = Date.now();
const masterDatabaseName = `codexsun_platform_e2e_${runId}`;
const tenantDatabaseName = `codexsun_tenant_e2e_${runId}`;
const tenantCode = `E2E${runId}`;
const tenantSlug = `codexsun-e2e-${runId}`;

Object.assign(process.env, {
  DB_MASTER_NAME: masterDatabaseName,
  DEFAULT_TENANT_CORPORATE_ID: tenantCode,
  DEFAULT_TENANT_DB_NAME: tenantDatabaseName,
  DEFAULT_TENANT_DOMAIN: `${tenantSlug}.localhost`,
  DEFAULT_TENANT_NAME: "CODEXSUN Bootstrap E2E",
  DEFAULT_TENANT_SLUG: tenantSlug,
  ENABLE_DEFAULT_TENANT_SEED: "0",
  NODE_ENV: "test"
});

const { env } = await import("../../apps/platform/api/src/env.js");
const { bootstrapPlatformDatabase, closePlatformDatabase } =
  await import("../../apps/platform/api/src/database/platform-database.js");
const { closeAllTenantDatabases } =
  await import("../../apps/platform/api/src/database/tenant-database.js");
const { tenantDatabaseMigrationsFor } =
  await import("../../apps/platform/api/src/database/tenant-app-database.js");
const { migrateTenantDatabase, seedTenantDatabase } =
  await import("../../apps/platform/api/src/modules/tenant/tenant.seed.js");
const { TenantService } =
  await import("../../apps/platform/api/src/modules/tenant/tenant.service.js");
const { DatabaseMaintenanceService } =
  await import("../../apps/platform/api/src/modules/database-maintenance/database-maintenance.service.js");
const { closeCoreDatabase } = await import("../../apps/core/api/src/database/core-database.js");
const { closeAllBillingDatabases } =
  await import("../../apps/billing/api/src/database/billing-database.js");

const admin = await createConnection({
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  user: env.DB_USER
});

try {
  await bootstrapPlatformDatabase();
  const tenant = await new TenantService().createTenant({
    corporateId: tenantCode,
    dbHost: env.DB_HOST,
    dbName: tenantDatabaseName,
    dbPort: env.DB_PORT,
    dbSecretRef: "DB_PASSWORD",
    dbType: env.DB_DRIVER,
    dbUser: env.DB_USER,
    defaultLandingApp: "billing",
    enabledModuleKeys: ["platform.application"],
    mobile: null,
    payloadSettings: {
      apps: { enabled: ["platform.application"] },
      landing: { app: "billing", mode: "tenant" },
      seed: { source: "tenant-selected-app-provisioning-e2e" }
    },
    primaryDomain: `${tenantSlug}.localhost`,
    slug: tenantSlug,
    status: "active",
    tenantCode,
    tenantName: "CODEXSUN Bootstrap E2E"
  });

  assert.deepEqual(
    [...tenant.enabledModuleKeys].sort(),
    ["billing.sales", "mail", "platform.application"],
    "New tenants should enable Billing and Mail by default."
  );

  const initial = await loadState();
  const expectedTenantMigrationCount = tenantDatabaseMigrationsFor(tenant).length;
  assert.equal(initial.platform.tenants, 1);
  assert.equal(initial.platform.tenantDomains, 1);
  assert.equal(initial.platform.subscriptions, 0);
  assert.ok(initial.platform.apps > 0);
  assert.ok(initial.platform.plans > 0);
  assert.equal(initial.platform.completedRuns, 1);
  assert.equal(initial.platform.runningRuns, 0);
  assert.equal(initial.tenant.moduleSettings, 3);
  assert.equal(initial.tenant.enabledBillingModules, 1);
  assert.equal(initial.tenant.companies, 1);
  assert.equal(initial.tenant.codexsunCompanies, 1);
  assert.equal(initial.tenant.currentFinancialYears, 1);
  assert.equal(initial.tenant.defaultCompanies, 1);
  assert.equal(initial.tenant.demoSuppliers, 1);
  assert.equal(initial.tenant.billingSettings, 1);
  assert.equal(initial.tenant.billingTables, 8);
  assert.equal(initial.tenant.mailTables, 4);
  assert.equal(initial.tenant.migrationCount, expectedTenantMigrationCount);

  await admin.changeUser({ database: masterDatabaseName });
  await admin.query(`DROP DATABASE \`${tenantDatabaseName}\``);
  await migrateTenantDatabase(tenant);
  const migratedOnly = await loadState();
  assert.equal(migratedOnly.tenant.migrationCount, expectedTenantMigrationCount);
  assert.equal(migratedOnly.tenant.moduleSettings, 0);
  assert.equal(migratedOnly.tenant.companies, 0);
  assert.equal(migratedOnly.tenant.billingSettings, 0);
  assert.equal(migratedOnly.tenant.mailTables, 4);

  await seedTenantDatabase(tenant);
  const separatelySeeded = await loadState();
  assert.deepEqual(separatelySeeded.tenant, initial.tenant);

  await admin.changeUser({ database: masterDatabaseName });
  await admin.query(`DROP DATABASE \`${tenantDatabaseName}\``);
  const reinstalledRun = await new DatabaseMaintenanceService().reinstallTenant(tenant.id, {
    note: "Warm-cache tenant reinstall E2E."
  });
  assert.equal(reinstalledRun?.status, "completed");
  const reinstalled = await loadState();
  assert.deepEqual(reinstalled.tenant, initial.tenant);
  assert.equal(reinstalled.platform.completedRuns, 2);
  assert.equal(reinstalled.platform.runningRuns, 0);

  await insertLegacyDuplicateRun(tenant.id);

  await closeAllBillingDatabases();
  await closeCoreDatabase();
  await closeAllTenantDatabases();
  await closePlatformDatabase();

  await bootstrapPlatformDatabase();

  const restarted = await loadState();
  assert.deepEqual(restarted.tenant, initial.tenant);
  assert.deepEqual(withoutRunCounts(restarted.platform), withoutRunCounts(initial.platform));
  assert.equal(restarted.platform.completedRuns, 3);
  assert.equal(restarted.platform.runningRuns, 0);
  console.log("Platform/Core/Billing/Mail bootstrap E2E passed", {
    masterDatabaseName,
    state: restarted,
    tenantId: tenant.id,
    tenantDatabaseName
  });
} finally {
  await closeAllBillingDatabases().catch(() => undefined);
  await closeCoreDatabase().catch(() => undefined);
  await closeAllTenantDatabases().catch(() => undefined);
  await closePlatformDatabase().catch(() => undefined);
  await admin.query(`DROP DATABASE IF EXISTS \`${tenantDatabaseName}\``);
  await admin.query(`DROP DATABASE IF EXISTS \`${masterDatabaseName}\``);
  await admin.end();
  await rm(resolve(process.cwd(), "storage", tenantSlug), { force: true, recursive: true });
}

async function loadState() {
  await admin.changeUser({ database: masterDatabaseName });
  const platform = {
    apps: await count("platform_apps"),
    completedRuns: await countWhere("database_maintenance_runs", "status = 'completed'"),
    plans: await count("plans"),
    runningRuns: await countWhere("database_maintenance_runs", "status = 'running'"),
    subscriptions: await count("subscriptions"),
    tenantDomains: await count("tenant_domains"),
    tenants: await count("tenants")
  };

  await admin.changeUser({ database: tenantDatabaseName });
  const tenant = {
    billingSettings: await countWhere(
      "billing_company_settings",
      "settings_key = 'billing' AND company_id = (SELECT company_id FROM default_company_settings WHERE singleton_key = 1)"
    ),
    billingTables: await countBillingRootTables(),
    codexsunCompanies: await countWhere("companies", "name = 'codexsun'"),
    companies: await count("companies"),
    currentFinancialYears: await countWhere("financial_years", "is_current = 1"),
    defaultCompanies: await count("default_company_settings"),
    demoSuppliers: await countWhere(
      "contacts",
      "code = 'C-0000' AND name = 'Codexsun Demo Supplier' AND status = 'active'"
    ),
    enabledBillingModules: await countWhere(
      "module_settings",
      "module_key = 'billing.sales' AND enabled = 1"
    ),
    mailTables: await countNamedTables([
      "mail_settings",
      "mail_messages",
      "mail_attachments",
      "mail_events"
    ]),
    migrationCount: await count("schema_migrations"),
    moduleSettings: await count("module_settings")
  };
  return { platform, tenant };
}

async function count(tableName: string) {
  const [rows] = await admin.query<Array<RowDataPacket & { row_count: number | string }>>(
    `SELECT COUNT(*) AS row_count FROM \`${tableName}\``
  );
  return Number(rows[0]?.row_count ?? 0);
}

async function countWhere(tableName: string, predicate: string) {
  const [rows] = await admin.query<Array<RowDataPacket & { row_count: number | string }>>(
    `SELECT COUNT(*) AS row_count FROM \`${tableName}\` WHERE ${predicate}`
  );
  return Number(rows[0]?.row_count ?? 0);
}

async function countBillingRootTables() {
  const [rows] = await admin.query<Array<RowDataPacket & { row_count: number | string }>>(
    "SELECT COUNT(*) AS row_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('billing_sales','billing_purchases','billing_export_sales','billing_quotations','billing_payments','billing_receipts','billing_settings','billing_dashboard_snapshots')"
  );
  return Number(rows[0]?.row_count ?? 0);
}

async function countNamedTables(tableNames: string[]) {
  const placeholders = tableNames.map(() => "?").join(",");
  const [rows] = await admin.query<Array<RowDataPacket & { row_count: number | string }>>(
    `SELECT COUNT(*) AS row_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`,
    tableNames
  );
  return Number(rows[0]?.row_count ?? 0);
}

async function insertLegacyDuplicateRun(tenantId: number) {
  await admin.changeUser({ database: masterDatabaseName });
  const createdAt = new Date("2026-07-18T16:41:26.000Z");
  const values = [
    ["e2e00001", "running", null],
    ["e2e00002", "completed", createdAt]
  ] as const;
  for (const [uuid, status, completedAt] of values) {
    await admin.query(
      "INSERT INTO database_maintenance_runs (uuid, database_scope, target_key, database_name, operation, status, details_json, created_at, completed_at) VALUES (?, 'tenant', ?, ?, 'migrate', ?, '{}', ?, ?)",
      [uuid, String(tenantId), tenantDatabaseName, status, createdAt, completedAt]
    );
  }
}

function withoutRunCounts(platform: Awaited<ReturnType<typeof loadState>>["platform"]) {
  const { completedRuns: _completedRuns, runningRuns: _runningRuns, ...stable } = platform;
  return stable;
}
