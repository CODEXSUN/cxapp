import {
  billingTenantMigrations,
  migrateBillingTenantDatabase,
  seedBillingTenantDatabase
} from "@codexsun/billing-api";
import {
  coreTenantMigrations,
  migrateCoreTenantDatabase,
  seedCoreTenantDatabase
} from "@codexsun/core-api";
import { mailMigration, migrateMailModule, seedMailModule } from "@codexsun/mail-api";
import type { Kysely } from "kysely";
import type { TenantDatabase } from "./schema.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { tenantRuntimeMigrations } from "../modules/tenant/tenant.migration.js";

const mailTenantMigration = {
  description: "Tenant Mail settings, messages, attachments, and delivery events.",
  name: mailMigration.key
} as const;

export function tenantDatabaseMigrationsFor(tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  return [
    ...tenantRuntimeMigrations.map(({ description, name, statements }) => ({
      description,
      name,
      statements
    })),
    ...(enabled.has("billing.sales")
      ? [...coreTenantMigrations, ...billingTenantMigrations].map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("mail")
      ? [{ ...mailTenantMigration, statements: [`RUN ${mailTenantMigration.name}`] }]
      : [])
  ];
}

export async function migrateSelectedTenantApps(database: Kysely<TenantDatabase>, tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  const provisionedApps = ["application"];

  if (enabled.has("billing.sales")) {
    await migrateCoreTenantDatabase(tenant.dbName);
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

  if (enabled.has("billing.sales")) {
    await seedCoreTenantDatabase(tenant.dbName);
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

export async function provisionSelectedTenantApps(
  database: Kysely<TenantDatabase>,
  tenant: Tenant
) {
  const migrated = await migrateSelectedTenantApps(database, tenant);
  const seeded = await seedSelectedTenantApps(database, tenant);
  return { ...migrated, ...seeded };
}
