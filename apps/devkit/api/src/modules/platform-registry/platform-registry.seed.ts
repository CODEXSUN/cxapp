import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Kysely } from "kysely";
import { resolveDevkitSeedDirectory } from "../../database/seed-source.js";
import type { DevkitDatabase } from "../../database/schema.js";
import type {
  PlatformRegistryGroup,
  PlatformRegistryModule,
  PlatformRegistryPlatform
} from "./platform-registry.types.js";

const sourceDir = resolveDevkitSeedDirectory(import.meta.url, "platform-registry-json");

export async function seedPlatformRegistryModule(database: Kysely<DevkitDatabase>) {
  let records = 0;
  records += await seedPlatforms(database);
  records += await seedGroups(database);
  records += await seedModules(database);
  return { module: "devkit.platform-registry", records };
}

async function seedPlatforms(database: Kysely<DevkitDatabase>) {
  if ((await count(database, "devkit_platform_registry_platforms")) > 0) return 0;
  const rows = await readJson<PlatformRegistryPlatform[]>("platform-registry.json");
  if (rows.length) {
    await database
      .insertInto("devkit_platform_registry_platforms")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          name: row.name,
          platform_key: row.key,
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id)
        }))
      )
      .execute();
  }
  return rows.length;
}

async function seedGroups(database: Kysely<DevkitDatabase>) {
  if ((await count(database, "devkit_platform_registry_groups")) > 0) return 0;
  const rows = await readJson<PlatformRegistryGroup[]>("module-groups.json");
  if (rows.length) {
    await database
      .insertInto("devkit_platform_registry_groups")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          group_key: row.key,
          name: row.name,
          parent_group_uuid: null,
          platform_uuid: importedUuid(row.platformId),
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id)
        }))
      )
      .execute();

    for (const row of rows.filter((item) => item.parentGroupId)) {
      await database
        .updateTable("devkit_platform_registry_groups")
        .set({ parent_group_uuid: importedUuid(row.parentGroupId) })
        .where("uuid", "=", importedUuid(row.id))
        .execute();
    }
  }
  return rows.length;
}

async function seedModules(database: Kysely<DevkitDatabase>) {
  if ((await count(database, "devkit_platform_registry_modules")) > 0) return 0;
  const rows = await readJson<PlatformRegistryModule[]>("module-registry.json");
  if (rows.length) {
    await database
      .insertInto("devkit_platform_registry_modules")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          documentation_json: JSON.stringify(row.documentation ?? {}),
          group_uuid: importedUuid(row.groupId),
          module_key: row.key,
          module_type: row.moduleType ?? "module",
          name: row.name,
          parent_module_uuid: null,
          planning_notes_json: JSON.stringify(row.planningNotes ?? []),
          route_path: row.routePath ?? "",
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id)
        }))
      )
      .execute();

    for (const row of rows.filter((item) => item.parentModuleId)) {
      await database
        .updateTable("devkit_platform_registry_modules")
        .set({ parent_module_uuid: importedUuid(row.parentModuleId) })
        .where("uuid", "=", importedUuid(row.id))
        .execute();
    }
  }
  return rows.length;
}

async function readJson<T>(file: string) {
  return JSON.parse(await readFile(join(sourceDir, file), "utf8")) as T;
}

async function count(
  database: Kysely<DevkitDatabase>,
  table:
    | "devkit_platform_registry_groups"
    | "devkit_platform_registry_modules"
    | "devkit_platform_registry_platforms"
) {
  const row = await database
    .selectFrom(table)
    .select(({ fn }) => fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  return Number(row.count);
}

function importedUuid(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function date(value: string) {
  return new Date(value);
}
