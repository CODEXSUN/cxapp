import { sql, type Kysely } from "kysely";

export const billingSettingsMigration = {
  description: "Tenant-owned, company-scoped Billing document and numbering settings.",
  key: "billing.settings.company-v2"
} as const;

export async function migrateBillingSettingsModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_settings (
      id varchar(40) primary key,
      settings_json longtext null,
      created_at varchar(40) null,
      updated_at varchar(40) null
    )
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_company_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      settings_key VARCHAR(40) NOT NULL DEFAULT 'billing',
      settings_json LONGTEXT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_company_settings_uuid_unique (uuid),
      UNIQUE KEY billing_company_settings_owner_unique (company_id, settings_key),
      CONSTRAINT billing_company_settings_company_fk FOREIGN KEY (company_id)
        REFERENCES companies (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
