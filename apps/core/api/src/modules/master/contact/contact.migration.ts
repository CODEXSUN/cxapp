import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";

export const contactMigration = {
  description: "Contact master and contact-owned detail tables.",
  key: "core.master.contact"
} as const;

export async function migrateContactModule(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS core_contacts (
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      code VARCHAR(80) NOT NULL,
      name VARCHAR(191) NOT NULL,
      legal_name VARCHAR(191) NULL,
      type_id INT NULL,
      type_name VARCHAR(191) NULL,
      group_id INT NULL,
      group_name VARCHAR(191) NULL,
      primary_phone VARCHAR(80) NULL,
      primary_email VARCHAR(191) NULL,
      gstin VARCHAR(40) NULL,
      pan VARCHAR(40) NULL,
      msme_no VARCHAR(80) NULL,
      msme_category VARCHAR(80) NULL,
      tan_no VARCHAR(80) NULL,
      tds_available TINYINT(1) NOT NULL DEFAULT 0,
      tcs_available TINYINT(1) NOT NULL DEFAULT 0,
      opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      credit_limit DECIMAL(18,2) NOT NULL DEFAULT 0,
      website VARCHAR(255) NULL,
      description TEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY contacts_code_unique (code),
      INDEX contacts_status_name (status, name),
      INDEX contacts_type (type_id),
      INDEX contacts_group (group_id),
      CONSTRAINT contacts_type_fk FOREIGN KEY (type_id) REFERENCES core_contact_types (id) ON DELETE RESTRICT,
      CONSTRAINT contacts_group_fk FOREIGN KEY (group_id) REFERENCES core_contact_groups (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS core_contacts_emails (
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NOT NULL,
      email VARCHAR(191) NOT NULL,
      email_type VARCHAR(80) NOT NULL DEFAULT 'Primary',
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 1,
      INDEX contacts_emails_parent (parent_id, sort_order),
      CONSTRAINT contacts_emails_parent_fk FOREIGN KEY (parent_id) REFERENCES core_contacts (id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS core_contacts_phones (
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NOT NULL,
      phone VARCHAR(80) NOT NULL,
      phone_type VARCHAR(80) NOT NULL DEFAULT 'Mobile',
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 1,
      INDEX contacts_phones_parent (parent_id, sort_order),
      CONSTRAINT contacts_phones_parent_fk FOREIGN KEY (parent_id) REFERENCES core_contacts (id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS core_contacts_addresses (
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NOT NULL,
      address_type_id INT NULL,
      address_type_name VARCHAR(191) NULL,
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255) NULL,
      country_id INT NULL,
      country_name VARCHAR(191) NULL,
      state_id INT NULL,
      state_name VARCHAR(191) NULL,
      district_id INT NULL,
      district_name VARCHAR(191) NULL,
      city_id INT NULL,
      city_name VARCHAR(191) NULL,
      pincode_id INT NULL,
      pincode_name VARCHAR(80) NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 1,
      INDEX contacts_addresses_parent (parent_id, sort_order),
      INDEX contacts_addresses_location (country_id, state_id, district_id, city_id, pincode_id),
      CONSTRAINT contacts_addresses_parent_fk FOREIGN KEY (parent_id) REFERENCES core_contacts (id) ON DELETE CASCADE,
      CONSTRAINT contacts_addresses_type_fk FOREIGN KEY (address_type_id) REFERENCES core_address_types (id) ON DELETE RESTRICT,
      CONSTRAINT contacts_addresses_country_fk FOREIGN KEY (country_id) REFERENCES core_countries (id) ON DELETE RESTRICT,
      CONSTRAINT contacts_addresses_state_fk FOREIGN KEY (state_id) REFERENCES core_states (id) ON DELETE RESTRICT,
      CONSTRAINT contacts_addresses_district_fk FOREIGN KEY (district_id) REFERENCES core_districts (id) ON DELETE RESTRICT,
      CONSTRAINT contacts_addresses_city_fk FOREIGN KEY (city_id) REFERENCES core_cities (id) ON DELETE RESTRICT,
      CONSTRAINT contacts_addresses_pincode_fk FOREIGN KEY (pincode_id) REFERENCES core_pincodes (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS core_contacts_bank_accounts (
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NOT NULL,
      bank_name_id INT NULL,
      bank_name VARCHAR(191) NULL,
      account_type VARCHAR(80) NULL,
      account_number VARCHAR(120) NOT NULL,
      holder_name VARCHAR(191) NULL,
      ifsc VARCHAR(40) NULL,
      branch VARCHAR(191) NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 1,
      INDEX contacts_bank_accounts_parent (parent_id, sort_order),
      INDEX contacts_bank_accounts_bank (bank_name_id),
      CONSTRAINT contacts_bank_accounts_parent_fk FOREIGN KEY (parent_id) REFERENCES core_contacts (id) ON DELETE CASCADE,
      CONSTRAINT contacts_bank_accounts_bank_fk FOREIGN KEY (bank_name_id) REFERENCES core_bank_names (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS core_contacts_social_links (
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NOT NULL,
      platform VARCHAR(80) NOT NULL,
      url VARCHAR(255) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 1,
      INDEX contacts_social_links_parent (parent_id, sort_order),
      CONSTRAINT contacts_social_links_parent_fk FOREIGN KEY (parent_id) REFERENCES core_contacts (id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  // Compatibility-only data normalization belongs to the owning migration,
  // never to the repeatable default seeder.
  await sql`UPDATE core_contacts_addresses AS address
    INNER JOIN core_countries AS current_country ON current_country.id=address.country_id
    INNER JOIN core_countries AS india ON india.code='IN'
    SET address.country_id=india.id,address.country_name=india.name
    WHERE current_country.code='UNKNOWN' OR current_country.name='-'`.execute(database);
  await sql`UPDATE core_contacts AS legacy
    LEFT JOIN core_contacts AS canonical
      ON canonical.id<>legacy.id AND canonical.code=REPLACE(legacy.code, '_', '-')
    SET legacy.code=REPLACE(legacy.code, '_', '-')
    WHERE legacy.code REGEXP '^C_[0-9]+$' AND canonical.id IS NULL`.execute(database);
}
