import { sql, type Kysely } from "kysely";
import type { PlatformDatabase, TenantDatabase } from "../../database/schema.js";
import {
  migrateTenantPermissionModule,
  tenantPermissionMigration
} from "../tenant-permission/index.js";
import {
  migrateTenantRolePermissionModule,
  tenantRolePermissionMigration
} from "../tenant-role-permission/index.js";
import { migrateTenantRoleModule, tenantRoleMigration } from "../tenant-role/index.js";
import { migrateTenantUserRoleModule, tenantUserRoleMigration } from "../tenant-user-role/index.js";
import { migrateTenantUserModule, tenantUserMigration } from "../tenant-user/index.js";

export const tenantMigration = {
  key: "platform.tenant.foundation",
  status: "active"
} as const;

export const tenantRuntimeMigrations = [
  {
    description: "Tenant migration ledger and runtime foundation.",
    name: "001_tenant_foundation",
    statements: [
      "RENAME legacy tenant_* tables to module-owned names when present",
      "CREATE TABLE IF NOT EXISTS schema_migrations (...)"
    ]
  },
  {
    description: "Tenant application module settings.",
    name: "002_runtime_table_names",
    statements: ["CREATE TABLE IF NOT EXISTS module_settings (...)"]
  },
  {
    description: "Tenant users and authentication identities.",
    name: tenantUserMigration.key,
    statements: ["RUN platform.tenant-user migration"]
  },
  {
    description: "Tenant roles and lifecycle state.",
    name: tenantRoleMigration.key,
    statements: ["RUN platform.tenant-role migration"]
  },
  {
    description: "Tenant permission catalog.",
    name: tenantPermissionMigration.key,
    statements: ["RUN platform.tenant-permission migration"]
  },
  {
    description: "Tenant user-to-role assignments.",
    name: tenantUserRoleMigration.key,
    statements: ["RUN platform.tenant-user-role migration"]
  },
  {
    description: "Tenant role-to-permission assignments.",
    name: tenantRolePermissionMigration.key,
    statements: ["RUN platform.tenant-role-permission migration"]
  },
  {
    description: "Flatten legacy tenant access table names.",
    name: "004_flatten_access_table_names",
    statements: ["RENAME legacy access_* tables to module-owned names when present"]
  }
] as const;

export async function migrateTenantRegistryModule(database: Kysely<PlatformDatabase>) {
  await database.schema
    .createTable("tenants")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("tenant_code", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("tenant_name", "varchar(180)", (col) => col.notNull())
    .addColumn("corporate_id", "varchar(120)")
    .addColumn("mobile", "varchar(40)")
    .addColumn("slug", "varchar(120)", (col) => col.notNull().unique())
    .addColumn("status", "varchar(32)", (col) => col.notNull())
    .addColumn("db_type", "varchar(32)", (col) => col.notNull())
    .addColumn("db_host", "varchar(180)", (col) => col.notNull())
    .addColumn("db_port", "integer", (col) => col.notNull())
    .addColumn("db_name", "varchar(120)", (col) => col.notNull())
    .addColumn("db_user", "varchar(120)", (col) => col.notNull())
    .addColumn("db_secret_ref", "varchar(180)", (col) => col.notNull())
    .addColumn("enabled_module_keys", "json", (col) => col.notNull())
    .addColumn("default_landing_app", "varchar(64)", (col) => col.notNull())
    .addColumn("payload_settings", "json", (col) => col.notNull())
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
  await ensureTenantColumns(database);

  await database.schema
    .createTable("tenant_audit_events")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("tenant_id", "integer", (col) => col.notNull())
    .addColumn("event_name", "varchar(120)", (col) => col.notNull())
    .addColumn("actor_email", "varchar(180)", (col) => col.notNull())
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await database.schema
    .createIndex("tenant_audit_events_tenant_id_idx")
    .ifNotExists()
    .on("tenant_audit_events")
    .column("tenant_id")
    .execute();
}

export async function migrateTenantRuntimeModule(database: Kysely<TenantDatabase>) {
  console.info("[database] migrating tenant runtime module tables");
  await renameLegacyTenantRuntimeTables(database);
  await database.schema
    .createTable("schema_migrations")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "varchar(160)", (col) => col.notNull().unique())
    .addColumn("applied_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await database.schema
    .createTable("module_settings")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("module_key", "varchar(160)", (col) => col.notNull().unique())
    .addColumn("enabled", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("settings_json", "json", (col) => col.notNull())
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await database
    .insertInto("schema_migrations")
    .ignore()
    .values([{ name: "001_tenant_foundation" }, { name: "002_runtime_table_names" }])
    .execute();

  await migrateTenantUserModule(database);
  await migrateTenantRoleModule(database);
  await migrateTenantPermissionModule(database);
  await migrateTenantUserRoleModule(database);
  await migrateTenantRolePermissionModule(database);

  await database
    .insertInto("schema_migrations")
    .ignore()
    .values({ name: "004_flatten_access_table_names" })
    .execute();
  console.info(
    "[database] tenant runtime migrations applied through: 004_flatten_access_table_names"
  );
}

const tenantRuntimeTableRenames = [
  ["tenant_migrations", "schema_migrations"],
  ["tenant_module_settings", "module_settings"],
  ["tenant_users", "users"],
  ["tenant_roles", "roles"],
  ["tenant_permissions", "permissions"],
  ["tenant_role_permissions", "role_permissions"],
  ["tenant_user_roles", "user_roles"],
  ["access_users", "users"],
  ["access_roles", "roles"],
  ["access_permissions", "permissions"],
  ["access_role_permissions", "role_permissions"],
  ["access_user_roles", "user_roles"]
] as const;

async function renameLegacyTenantRuntimeTables(database: Kysely<TenantDatabase>) {
  for (const [legacyName, currentName] of tenantRuntimeTableRenames) {
    if ((await tableExists(database, legacyName)) && !(await tableExists(database, currentName))) {
      await sql.raw(`RENAME TABLE \`${legacyName}\` TO \`${currentName}\``).execute(database);
    }
  }
}

async function tableExists(database: Kysely<TenantDatabase>, tableName: string) {
  const result = await sql<{ table_count: number | string }>`
    SELECT COUNT(*) AS table_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${tableName}
  `.execute(database);
  return Number(result.rows[0]?.table_count ?? 0) > 0;
}

async function ensureTenantColumns(database: Kysely<PlatformDatabase>) {
  await addColumnIfMissing(database, "tenants", "uuid", "VARCHAR(8) NULL UNIQUE");
  await addColumnIfMissing(database, "tenants", "corporate_id", "VARCHAR(120) NULL");
  await addColumnIfMissing(database, "tenants", "mobile", "VARCHAR(40) NULL");
  await addColumnIfMissing(database, "tenants", "slug", "VARCHAR(120) NULL");
  await addColumnIfMissing(database, "tenants", "status", "VARCHAR(32) NOT NULL DEFAULT 'active'");
  await addColumnIfMissing(
    database,
    "tenants",
    "db_type",
    "VARCHAR(32) NOT NULL DEFAULT 'mariadb'"
  );
  await addColumnIfMissing(
    database,
    "tenants",
    "db_host",
    "VARCHAR(180) NOT NULL DEFAULT '127.0.0.1'"
  );
  await addColumnIfMissing(database, "tenants", "db_port", "INT NOT NULL DEFAULT 3306");
  await addColumnIfMissing(database, "tenants", "db_name", "VARCHAR(120) NULL");
  await addColumnIfMissing(database, "tenants", "db_user", "VARCHAR(120) NOT NULL DEFAULT 'root'");
  await addColumnIfMissing(
    database,
    "tenants",
    "db_secret_ref",
    "VARCHAR(180) NOT NULL DEFAULT 'DB_PASSWORD'"
  );
  await addColumnIfMissing(database, "tenants", "enabled_module_keys", "LONGTEXT NULL");
  await addColumnIfMissing(
    database,
    "tenants",
    "default_landing_app",
    "VARCHAR(64) NOT NULL DEFAULT 'application'"
  );
  await addColumnIfMissing(database, "tenants", "payload_settings", "LONGTEXT NULL");
  await addColumnIfMissing(database, "tenants", "storage_root", "VARCHAR(255) NOT NULL DEFAULT ''");
  await addColumnIfMissing(
    database,
    "tenants",
    "storage_public_root",
    "VARCHAR(255) NOT NULL DEFAULT ''"
  );
  await addColumnIfMissing(
    database,
    "tenants",
    "storage_private_root",
    "VARCHAR(255) NOT NULL DEFAULT ''"
  );
  await addColumnIfMissing(
    database,
    "tenants",
    "created_at",
    "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
  );
  await addColumnIfMissing(
    database,
    "tenants",
    "updated_at",
    "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
  );
}

async function addColumnIfMissing(
  database: Kysely<PlatformDatabase>,
  tableName: string,
  columnName: string,
  definition: string
) {
  if (await columnExists(database, tableName, columnName)) {
    return;
  }
  try {
    await sql
      .raw(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`)
      .execute(database);
  } catch (error) {
    if (!isDuplicateColumnError(error)) throw error;
  }
}

async function columnExists(
  database: Kysely<PlatformDatabase>,
  tableName: string,
  columnName: string
) {
  const result = await sql<{ column_count: number | string }>`
    SELECT COUNT(*) AS column_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${columnName}
  `.execute(database);
  return Number(result.rows[0]?.column_count ?? 0) > 0;
}

function isDuplicateColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "errno" in error) &&
    ((error as { code?: string; errno?: number }).code === "ER_DUP_FIELDNAME" ||
      (error as { code?: string; errno?: number }).errno === 1060)
  );
}
