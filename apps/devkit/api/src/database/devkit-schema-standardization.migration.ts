import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "./schema.js";
import { quoteIdentifier } from "./database-utils.js";

export const devkitSchemaStandardizationMigration = {
  description: "CXApp standard identity, status, and audit columns for every DevKit-owned table.",
  key: "devkit.schema-standardization.v1"
} as const;

const additions = {
  devkit_platform_registry_activity: [
    "status VARCHAR(24) NOT NULL DEFAULT 'active'",
    "created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration'",
    "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  ],
  devkit_platform_registry_groups: ["created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration'"],
  devkit_platform_registry_modules: ["created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration'"],
  devkit_platform_registry_platforms: [
    "created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration'"
  ]
} as const;

export async function standardizeDevkitSchema(database: Kysely<DevkitDatabase>) {
  for (const [table, columns] of Object.entries(additions)) {
    for (const column of columns) {
      await sql
        .raw(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN IF NOT EXISTS ${column}`)
        .execute(database);
    }
  }
  return devkitSchemaStandardizationMigration;
}
