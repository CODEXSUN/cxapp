import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export const tenantRoleMigration = { key: "platform.tenant-role.foundation-v1" } as const;
export async function migrateTenantRoleModule(database: Kysely<TenantDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS roles (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,uuid VARCHAR(8) NOT NULL UNIQUE,\`key\` VARCHAR(120) NOT NULL UNIQUE,label VARCHAR(160) NOT NULL,description VARCHAR(500) NOT NULL DEFAULT '',status VARCHAR(24) NOT NULL DEFAULT 'active',is_protected BOOLEAN NOT NULL DEFAULT FALSE,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  for (const [column, definition] of [
    ["description", "VARCHAR(500) NOT NULL DEFAULT '' AFTER label"],
    ["is_protected", "BOOLEAN NOT NULL DEFAULT FALSE AFTER status"]
  ] as const) {
    if (!(await exists(database, column)))
      await sql.raw(`ALTER TABLE roles ADD COLUMN \`${column}\` ${definition}`).execute(database);
  }
  await database
    .insertInto("schema_migrations")
    .ignore()
    .values({ name: tenantRoleMigration.key })
    .execute();
}
async function exists(database: Kysely<TenantDatabase>, column: string) {
  const r = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='roles' AND COLUMN_NAME=${column}`.execute(
    database
  );
  return Number(r.rows[0]?.count ?? 0) > 0;
}
