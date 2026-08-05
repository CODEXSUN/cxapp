import { sql, type Kysely } from "kysely";

export const gstStatementFilingMigration = {
  description: "Monthly GST filing references and opening-balance reconciliation.",
  key: "billing.reports.gst-statement.filing-v1"
} as const;

export async function migrateGstStatementFiling<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_gst_filings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      filing_year SMALLINT NOT NULL,
      filing_month TINYINT NOT NULL,
      opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      gstr1_arn VARCHAR(80) NOT NULL DEFAULT '',
      gstr1_filed_on DATE NULL,
      gstr3b_arn VARCHAR(80) NOT NULL DEFAULT '',
      gstr3b_filed_on DATE NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:gst-statement',
      updated_by VARCHAR(191) NOT NULL DEFAULT 'system:gst-statement',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_gst_filings_period_unique
        (company_id, financial_year_id, filing_year, filing_month),
      INDEX billing_gst_filings_period (filing_year, filing_month),
      CONSTRAINT billing_gst_filings_company_fk FOREIGN KEY (company_id)
        REFERENCES core_companies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_gst_filings_financial_year_fk FOREIGN KEY (financial_year_id)
        REFERENCES core_financial_years (id) ON DELETE RESTRICT,
      CONSTRAINT billing_gst_filings_month_check CHECK (filing_month BETWEEN 1 AND 12)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
