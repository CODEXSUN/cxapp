import { sql, type Kysely } from "kysely";
import {
  applyTablePrefixPolicy,
  ensureStandardTableColumns,
  rollbackMigrationBatch,
  rollbackTablePrefixPolicy,
  runMigrationBatch,
  type MigrationBatch
} from "@codexsun/framework/db";
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
    description: "Rename legacy tenant runtime tables to app_ module-owned names.",
    name: "platform.tenant-runtime.table-prefix-v1",
    statements: ["RENAME legacy runtime tables to app_* names when present"]
  },
  {
    description: "Tenant application module settings.",
    name: "platform.tenant-runtime.settings-v1",
    statements: [
      "CREATE TABLE IF NOT EXISTS app_module_settings (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,status VARCHAR(24) NOT NULL DEFAULT 'active',created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,...)"
    ]
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
    description: "Backfill and validate standard tenant runtime identity and audit columns.",
    name: "platform.tenant-runtime.standard-columns-v1",
    statements: ["VALIDATE standard identity and audit columns"]
  }
] as const;

const tenantRuntimeTableNames = [
  "schema_migrations",
  "module_settings",
  "permissions",
  "role_permissions",
  "roles",
  "user_roles",
  "users"
] as const;

const tenantRuntimePrefixPolicy = { include: tenantRuntimeTableNames, prefix: "app_" } as const;

export const tenantRuntimeMigrationBatch: MigrationBatch<TenantDatabase> = {
  batch: 1,
  description: "Tenant Platform runtime schema baseline through release 1.0.42.",
  scope: "platform-tenant-runtime",
  version: "1.0.42",
  steps: [
    {
      checksum: tenantRuntimeTableNames.join(","),
      description: "Rename legacy tenant runtime tables without copying or dropping data.",
      down: (database) =>
        rollbackTablePrefixPolicy(database, tenantRuntimePrefixPolicy).then(() => undefined),
      name: "platform.tenant-runtime.table-prefix-v1",
      up: (database) =>
        applyTablePrefixPolicy(database, tenantRuntimePrefixPolicy).then(() => undefined),
      version: 1
    },
    {
      checksum: "platform.tenant-runtime.settings-v1",
      description: "Tenant application module settings.",
      name: "platform.tenant-runtime.settings-v1",
      up: migrateTenantModuleSettings,
      version: 1
    },
    {
      checksum: `${tenantUserMigration.key}:v1`,
      description: "Tenant users and authentication identities.",
      name: tenantUserMigration.key,
      up: migrateTenantUserModule,
      version: 1
    },
    {
      checksum: `${tenantRoleMigration.key}:v1`,
      description: "Tenant roles and lifecycle state.",
      name: tenantRoleMigration.key,
      up: migrateTenantRoleModule,
      version: 1
    },
    {
      checksum: `${tenantPermissionMigration.key}:v1`,
      description: "Tenant permission catalog.",
      name: tenantPermissionMigration.key,
      up: migrateTenantPermissionModule,
      version: 1
    },
    {
      checksum: `${tenantUserRoleMigration.key}:v1`,
      description: "Tenant user-to-role assignments.",
      name: tenantUserRoleMigration.key,
      up: migrateTenantUserRoleModule,
      version: 1
    },
    {
      checksum: `${tenantRolePermissionMigration.key}:v1`,
      description: "Tenant role-to-permission assignments.",
      name: tenantRolePermissionMigration.key,
      up: migrateTenantRolePermissionModule,
      version: 1
    },
    {
      checksum: `standard-columns:${tenantRuntimeTableNames.join(",")}`,
      description: "Backfill and validate standard tenant runtime identity and audit columns.",
      name: "platform.tenant-runtime.standard-columns-v1",
      up: (database) =>
        ensureStandardTableColumns(
          database,
          tenantRuntimeTableNames
            .filter((tableName) => tableName !== "schema_migrations")
            .map((tableName) => `app_${tableName}`)
        ),
      version: 1
    },
    {
      checksum: `uuid-defaults:${tenantRuntimeTableNames.join(",")}`,
      description: "Add database-generated UUID defaults for repeatable tenant runtime writes.",
      name: "platform.tenant-runtime.uuid-defaults-v2",
      up: (database) =>
        ensureStandardTableColumns(
          database,
          tenantRuntimeTableNames
            .filter((tableName) => tableName !== "schema_migrations")
            .map((tableName) => `app_${tableName}`)
        ),
      version: 2
    }
  ]
};

export async function migrateTenantRegistryModule(database: Kysely<PlatformDatabase>) {
  await database.schema
    .createTable("app_tenants")
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
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .execute();
  await ensureTenantColumns(database);
  await database
    .updateTable("app_tenants")
    .set({ corporate_id: sql<string>`UPPER(tenant_code)` })
    .where("corporate_id", "is", null)
    .execute();
  await database.schema
    .createIndex("tenants_corporate_id_unique")
    .ifNotExists()
    .unique()
    .on("app_tenants")
    .column("corporate_id")
    .execute();

  await database.schema
    .createTable("app_tenant_audit_events")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("tenant_id", "integer", (col) => col.notNull())
    .addColumn("event_name", "varchar(120)", (col) => col.notNull())
    .addColumn("actor_email", "varchar(180)", (col) => col.notNull())
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addForeignKeyConstraint(
      "app_tenant_audit_events_tenant_fk",
      ["tenant_id"],
      "app_tenants",
      ["id"],
      (constraint) => constraint.onDelete("cascade")
    )
    .addColumn("status", "varchar(24)", (col) => col.notNull().defaultTo("active"))
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .addColumn("updated_at", "datetime", (col) =>
      col
        .notNull()
        .defaultTo(sql`CURRENT_TIMESTAMP`)
        .modifyEnd(sql`ON UPDATE CURRENT_TIMESTAMP`)
    )
    .execute();

  await database.schema
    .createIndex("tenant_audit_events_tenant_id_idx")
    .ifNotExists()
    .on("app_tenant_audit_events")
    .column("tenant_id")
    .execute();
}

export async function migrateTenantRuntimeModule(database: Kysely<TenantDatabase>) {
  console.info("[database] migrating tenant runtime module tables");
  await runMigrationBatch(database, tenantRuntimeMigrationBatch, { batchSize: 5 });
}

export async function rollbackTenantRuntimeModule(database: Kysely<TenantDatabase>) {
  return rollbackMigrationBatch(database, tenantRuntimeMigrationBatch);
}

async function migrateTenantModuleSettings(database: Kysely<TenantDatabase>) {
  await database.schema
    .createTable("app_module_settings")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("module_key", "varchar(160)", (col) => col.notNull().unique())
    .addColumn("enabled", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("settings_json", "json", (col) => col.notNull())
    .addColumn("status", "varchar(32)", (col) => col.notNull().defaultTo("active"))
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}

async function ensureTenantColumns(database: Kysely<PlatformDatabase>) {
  await addColumnIfMissing(database, "app_tenants", "uuid", "VARCHAR(8) NULL UNIQUE");
  await addColumnIfMissing(database, "app_tenants", "corporate_id", "VARCHAR(120) NULL");
  await addColumnIfMissing(database, "app_tenants", "mobile", "VARCHAR(40) NULL");
  await addColumnIfMissing(database, "app_tenants", "slug", "VARCHAR(120) NULL");
  await addColumnIfMissing(
    database,
    "app_tenants",
    "status",
    "VARCHAR(32) NOT NULL DEFAULT 'active'"
  );
  await addColumnIfMissing(
    database,
    "app_tenants",
    "db_type",
    "VARCHAR(32) NOT NULL DEFAULT 'mariadb'"
  );
  await addColumnIfMissing(
    database,
    "app_tenants",
    "db_host",
    "VARCHAR(180) NOT NULL DEFAULT '127.0.0.1'"
  );
  await addColumnIfMissing(database, "app_tenants", "db_port", "INT NOT NULL DEFAULT 3306");
  await addColumnIfMissing(database, "app_tenants", "db_name", "VARCHAR(120) NULL");
  await addColumnIfMissing(
    database,
    "app_tenants",
    "db_user",
    "VARCHAR(120) NOT NULL DEFAULT 'root'"
  );
  await addColumnIfMissing(
    database,
    "app_tenants",
    "db_secret_ref",
    "VARCHAR(180) NOT NULL DEFAULT 'DB_PASSWORD'"
  );
  await addColumnIfMissing(database, "app_tenants", "enabled_module_keys", "LONGTEXT NULL");
  await addColumnIfMissing(
    database,
    "app_tenants",
    "default_landing_app",
    "VARCHAR(64) NOT NULL DEFAULT 'application'"
  );
  await addColumnIfMissing(database, "app_tenants", "payload_settings", "LONGTEXT NULL");
  await addColumnIfMissing(
    database,
    "app_tenants",
    "storage_root",
    "VARCHAR(255) NOT NULL DEFAULT ''"
  );
  await addColumnIfMissing(
    database,
    "app_tenants",
    "storage_public_root",
    "VARCHAR(255) NOT NULL DEFAULT ''"
  );
  await addColumnIfMissing(
    database,
    "app_tenants",
    "storage_private_root",
    "VARCHAR(255) NOT NULL DEFAULT ''"
  );
  await addColumnIfMissing(
    database,
    "app_tenants",
    "created_at",
    "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
  );
  await addColumnIfMissing(
    database,
    "app_tenants",
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
