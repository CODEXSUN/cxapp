import type { Kysely } from "kysely";
import { renameLegacyTable } from "./database-utils.js";
import type { DevkitDatabase } from "./schema.js";

const registryTableRenames = [
  ["devkit_project_manager_registry_platforms", "devkit_platform_registry_platforms"],
  ["devkit_project_manager_registry_groups", "devkit_platform_registry_groups"],
  ["devkit_project_manager_registry_modules", "devkit_platform_registry_modules"],
  ["devkit_project_manager_activity", "devkit_platform_registry_activity"],
  ["project_manager_registry_platforms", "devkit_platform_registry_platforms"],
  ["project_manager_registry_groups", "devkit_platform_registry_groups"],
  ["project_manager_registry_modules", "devkit_platform_registry_modules"],
  ["project_manager_activity", "devkit_platform_registry_activity"]
] as const;

export const platformRegistryTableRenameMigration = {
  description: "Preserve Platform Registry data under its final owner table names.",
  key: "devkit.platform-registry-table-rename.sql.v1"
} as const;

export async function renamePlatformRegistryTables(database: Kysely<DevkitDatabase>) {
  for (const [legacyName, ownedName] of registryTableRenames) {
    await renameLegacyTable(database, legacyName, ownedName);
  }
}
