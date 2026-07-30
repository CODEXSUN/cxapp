import { AsyncLocalStorage } from "node:async_hooks";
import type { Kysely } from "kysely";
import {
  rollbackMigrationBatch,
  runMigrationBatch,
  type MigrationBatch
} from "@cxapp/framework/db";
import {
  migratePlatformRegistryModule,
  platformRegistryMigration
} from "../modules/platform-registry/platform-registry.migration.js";
import { seedPlatformRegistryModule } from "../modules/platform-registry/platform-registry.seed.js";
import type { DevkitDatabase } from "./schema.js";
import {
  devkitSchemaStandardizationMigration,
  standardizeDevkitSchema
} from "./devkit-schema-standardization.migration.js";
import {
  platformRegistryTableRenameMigration,
  renamePlatformRegistryTables
} from "./platform-registry-table-rename.js";
import {
  removeRetiredDevkitTables,
  retiredDevkitCleanupMigration
} from "./retired-devkit-cleanup.js";

const databaseContext = new AsyncLocalStorage<Kysely<DevkitDatabase>>();
const bootstraps = new WeakMap<Kysely<DevkitDatabase>, Promise<void>>();
const requestDatabase = new Proxy({} as Kysely<DevkitDatabase>, {
  get(_target, property) {
    const database = databaseContext.getStore();
    if (!database) throw new Error("DevKit requires a CXApp-provided request database.");
    const value = Reflect.get(database, property, database) as unknown;
    return typeof value === "function" ? value.bind(database) : value;
  }
});

const migrationSteps = [
  {
    description: platformRegistryTableRenameMigration.description,
    migrate: renamePlatformRegistryTables,
    name: platformRegistryTableRenameMigration.key
  },
  {
    description: platformRegistryMigration.description,
    migrate: migratePlatformRegistryModule,
    name: platformRegistryMigration.key
  },
  {
    description: devkitSchemaStandardizationMigration.description,
    migrate: standardizeDevkitSchema,
    name: devkitSchemaStandardizationMigration.key
  },
  {
    description: retiredDevkitCleanupMigration.description,
    migrate: removeRetiredDevkitTables,
    name: retiredDevkitCleanupMigration.key
  }
] as const;

const seedSteps = [{ name: "devkit.platform-registry", seed: seedPlatformRegistryModule }] as const;

export const devkitMigrationBatch: MigrationBatch<DevkitDatabase> = {
  batch: 1,
  description: "DevKit module-owned schema baseline for CXApp master and tenant databases.",
  scope: "devkit",
  version: "1.0.43",
  steps: migrationSteps.map(({ description, migrate, name }) => ({
    checksum: `${name}:cxapp-v1`,
    description,
    name,
    up: migrate,
    version: 1
  }))
};

export function getDevkitDatabase() {
  return requestDatabase;
}

export function runWithDevkitDatabase<T>(database: Kysely<DevkitDatabase>, callback: () => T) {
  return databaseContext.run(database, callback);
}

export async function bootstrapDevkitDatabase(database: Kysely<DevkitDatabase>) {
  const existing = bootstraps.get(database);
  if (existing) return existing;
  const bootstrap = (async () => {
    await migrateDevkitDatabase(database);
    await seedDevkitDatabase(database);
  })().catch((error) => {
    bootstraps.delete(database);
    throw error;
  });
  bootstraps.set(database, bootstrap);
  return bootstrap;
}

export async function migrateDevkitDatabase(database: Kysely<DevkitDatabase>) {
  const result = await runMigrationBatch(database, devkitMigrationBatch, { batchSize: 5 });
  console.info(
    `[database] DevKit migrations: ${result.applied.length} applied, ${result.skipped.length} checksum-validated`
  );
}

export function rollbackDevkitDatabase(database: Kysely<DevkitDatabase>) {
  return rollbackMigrationBatch(database, devkitMigrationBatch);
}

export async function seedDevkitDatabase(database: Kysely<DevkitDatabase>) {
  for (const step of seedSteps) {
    const result = await step.seed(database);
    console.info(`[seeder] ${step.name}: ${result.records} records imported`);
  }
}

export const devkitTenantMigrations = migrationSteps;

export const devkitDatabaseLifecycle = Object.freeze({
  migrations: Object.freeze(migrationSteps.map(({ name }) => name)),
  packageId: "@cxapp/devkit-api",
  seeders: Object.freeze(seedSteps.map(({ name }) => name)),
  async runSql({ database }: { database: unknown }) {
    await bootstrapDevkitDatabase(database as Kysely<DevkitDatabase>);
  }
});
