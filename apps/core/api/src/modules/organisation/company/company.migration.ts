import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";

export const companyMigration = {
  description: "Tenant company and company-owned detail tables.",
  key: "core.organisation.company"
} as const;

export async function migrateCompanyModule(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS companies (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,code VARCHAR(80) NOT NULL,name VARCHAR(191) NOT NULL,legal_name VARCHAR(191) NULL,type_id INT NULL,type_name VARCHAR(191) NULL,group_id INT NULL,group_name VARCHAR(191) NULL,primary_phone VARCHAR(80) NULL,primary_email VARCHAR(191) NULL,gstin VARCHAR(40) NULL,pan VARCHAR(40) NULL,msme_no VARCHAR(80) NULL,msme_category VARCHAR(80) NULL,tan_no VARCHAR(80) NULL,tds_available TINYINT(1) NOT NULL DEFAULT 0,tcs_available TINYINT(1) NOT NULL DEFAULT 0,website VARCHAR(255) NULL,description TEXT NULL,logo_path VARCHAR(255) NULL,logo_dark_path VARCHAR(255) NULL,industry_id INT NULL,industry_name VARCHAR(191) NULL,status VARCHAR(24) NOT NULL DEFAULT 'active',emails_json JSON NULL,phones_json JSON NULL,addresses_json JSON NULL,bank_accounts_json JSON NULL,social_links_json JSON NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY companies_code_unique(code),INDEX companies_status_name(status,name)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await removeLegacyTenantColumn(database);
  for (const [suffix, columns] of children)
    await sql
      .raw(
        `CREATE TABLE IF NOT EXISTS companies_${suffix} (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,parent_id INT NOT NULL,${columns},sort_order INT NOT NULL DEFAULT 1,INDEX companies_${suffix}_parent(parent_id,sort_order))`
      )
      .execute(database);
}
async function removeLegacyTenantColumn(database: Kysely<CoreDatabase>) {
  for (const indexName of [
    "companies_tenant_code",
    "companies_tenant_status",
    "uq_companies_tenant_code",
    "idx_companies_tenant_status"
  ]) {
    const result = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) AS count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='companies' AND INDEX_NAME=${indexName}`.execute(
      database
    );
    if (Number(result.rows[0]?.count ?? 0) > 0)
      await sql.raw(`ALTER TABLE companies DROP INDEX \`${indexName}\``).execute(database);
  }
  const result = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='companies' AND COLUMN_NAME='tenant_id'`.execute(
    database
  );
  if (Number(result.rows[0]?.count ?? 0) > 0)
    await sql.raw("ALTER TABLE companies DROP COLUMN tenant_id").execute(database);
}

const children = [
  [
    "emails",
    "email VARCHAR(191) NULL,email_type VARCHAR(80) NULL,is_primary TINYINT(1) NOT NULL DEFAULT 0"
  ],
  [
    "phones",
    "phone VARCHAR(80) NULL,phone_type VARCHAR(80) NULL,is_primary TINYINT(1) NOT NULL DEFAULT 0"
  ],
  [
    "addresses",
    "address_line1 VARCHAR(255) NULL,address_line2 VARCHAR(255) NULL,is_default TINYINT(1) NOT NULL DEFAULT 0"
  ],
  [
    "bank_accounts",
    "bank_name VARCHAR(191) NULL,account_number VARCHAR(120) NULL,is_primary TINYINT(1) NOT NULL DEFAULT 0"
  ],
  [
    "social_links",
    "platform VARCHAR(80) NULL,url VARCHAR(255) NULL,status VARCHAR(24) NOT NULL DEFAULT 'active'"
  ]
] as const;
