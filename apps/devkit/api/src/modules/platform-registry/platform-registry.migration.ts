import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export const platformRegistryMigration = {
  description:
    "Platform Registry hierarchy and audit activity with retired DevKit feature cleanup.",
  key: "devkit.platform-registry.sql.v1"
} as const;

export async function migratePlatformRegistryModule(database: Kysely<DevkitDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS devkit_platform_registry_platforms (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      platform_key VARCHAR(160) NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_platform_registry_platforms_uuid (uuid),
      UNIQUE KEY uq_platform_registry_platforms_key (platform_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_platform_registry_groups (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      platform_uuid CHAR(8) NOT NULL,
      parent_group_uuid CHAR(8) NULL,
      group_key VARCHAR(160) NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_platform_registry_groups_uuid (uuid),
      UNIQUE KEY uq_platform_registry_groups_key (group_key),
      KEY idx_platform_registry_groups_platform (platform_uuid, parent_group_uuid, sort_order),
      CONSTRAINT fk_platform_registry_groups_platform
        FOREIGN KEY (platform_uuid) REFERENCES devkit_platform_registry_platforms (uuid),
      CONSTRAINT fk_platform_registry_groups_parent
        FOREIGN KEY (parent_group_uuid) REFERENCES devkit_platform_registry_groups (uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_platform_registry_modules (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      group_uuid CHAR(8) NOT NULL,
      parent_module_uuid CHAR(8) NULL,
      module_key VARCHAR(200) NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      module_type VARCHAR(24) NOT NULL DEFAULT 'module',
      route_path VARCHAR(300) NOT NULL DEFAULT '',
      documentation_json LONGTEXT NOT NULL,
      planning_notes_json LONGTEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_platform_registry_modules_uuid (uuid),
      UNIQUE KEY uq_platform_registry_modules_key (module_key),
      KEY idx_platform_registry_modules_group (group_uuid, parent_module_uuid, sort_order),
      CONSTRAINT fk_platform_registry_modules_group
        FOREIGN KEY (group_uuid) REFERENCES devkit_platform_registry_groups (uuid),
      CONSTRAINT fk_platform_registry_modules_parent
        FOREIGN KEY (parent_module_uuid) REFERENCES devkit_platform_registry_modules (uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_platform_registry_activity (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      actor_email VARCHAR(240) NOT NULL,
      action VARCHAR(80) NOT NULL,
      record_kind VARCHAR(80) NOT NULL,
      record_uuid CHAR(8) NOT NULL,
      details_json LONGTEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_platform_registry_activity_uuid (uuid),
      KEY idx_devkit_platform_registry_activity_record (record_kind, record_uuid, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  return platformRegistryMigration;
}
