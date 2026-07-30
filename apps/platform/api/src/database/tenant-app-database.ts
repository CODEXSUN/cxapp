import {
  billingTenantMigrations,
  migrateBillingTenantDatabase,
  rollbackBillingTenantDatabase,
  seedBillingTenantDatabase
} from "@codexsun/billing-api";
import {
  coreTenantMigrations,
  migrateCoreTenantDatabase,
  rollbackCoreTenantDatabase,
  seedCoreTenantDatabase,
  setDefaultCompanyLandingAppForDatabase
} from "@codexsun/core-api";
import {
  mailMigrationBatch,
  migrateMailModule,
  rollbackMailModule,
  seedMailModule
} from "@codexsun/mail-api";
import type { Kysely } from "kysely";
import type { TenantDatabase } from "./schema.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { tenantRuntimeMigrations } from "../modules/tenant/tenant.migration.js";

const mailTenantMigrations = mailMigrationBatch.steps.map(({ description, name }) => ({
  description,
  name
}));

export function tenantDatabaseMigrationsFor(tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  return [
    ...tenantRuntimeMigrations.map(({ description, name, statements }) => ({
      description,
      name,
      statements
    })),
    ...coreTenantMigrations.map((migration) => ({
      ...migration,
      statements: [`RUN ${migration.name}`]
    })),
    ...(enabled.has("billing.sales")
      ? billingTenantMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("mail")
      ? mailTenantMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : [])
  ];
}

export async function migrateSelectedTenantApps(database: Kysely<TenantDatabase>, tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  const provisionedApps = ["application"];

  await migrateCoreTenantDatabase(tenant.dbName);

  if (enabled.has("billing.sales")) {
    await migrateBillingTenantDatabase(tenant.dbName);
    provisionedApps.push("billing");
  }

  if (enabled.has("mail")) {
    await migrateMailModule(database as never);
    provisionedApps.push("mail");
  }

  if (enabled.has("platform.task-manager")) {
    provisionedApps.push("task-manager");
  }

  return {
    migrationOrder: tenantDatabaseMigrationsFor(tenant).map((migration) => migration.name),
    provisionedApps
  };
}

export async function seedSelectedTenantApps(database: Kysely<TenantDatabase>, tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  const seededApps = ["application"];

  await seedCoreTenantDatabase(tenant.dbName);
  await setDefaultCompanyLandingAppForDatabase(tenant.dbName, tenant.defaultLandingApp);

  if (enabled.has("billing.sales")) {
    await seedBillingTenantDatabase(tenant.dbName);
    seededApps.push("billing");
  }

  if (enabled.has("mail")) {
    await seedMailModule(database as never);
    seededApps.push("mail");
  }

  if (enabled.has("platform.task-manager")) seededApps.push("task-manager");
  return { seededApps };
}

export async function rollbackSelectedTenantApps(database: Kysely<TenantDatabase>, tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  if (enabled.has("mail")) await rollbackMailModule(database as never);
  if (enabled.has("billing.sales")) await rollbackBillingTenantDatabase(tenant.dbName);
  await rollbackCoreTenantDatabase(tenant.dbName);
}

export async function provisionSelectedTenantApps(
  database: Kysely<TenantDatabase>,
  tenant: Tenant
) {
  const migrated = await migrateSelectedTenantApps(database, tenant);
  const seeded = await seedSelectedTenantApps(database, tenant);
  return { ...migrated, ...seeded };
}
