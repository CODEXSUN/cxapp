import { sql, type Kysely } from "kysely";

export const dashboardMigration = {
  key: "billing.dashboard.snapshot-v1",
  description: "Company and financial-year Billing dashboard read-model snapshots."
};

export async function migrateDashboardModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS billing_dashboard_snapshots (
    uuid CHAR(8) NOT NULL DEFAULT (LOWER(SUBSTRING(MD5(UUID()),1,8))) UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        financial_year_id INT NOT NULL,
        projection_version INT NOT NULL DEFAULT 1,
        snapshot_json JSON NOT NULL,
        last_event_name VARCHAR(160) NULL,
        projected_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY billing_dashboard_snapshot_context_unique (company_id, financial_year_id),
        INDEX billing_dashboard_snapshot_projected (projected_at),
        CONSTRAINT billing_dashboard_snapshot_company_fk FOREIGN KEY (company_id) REFERENCES core_companies (id) ON DELETE RESTRICT,
        CONSTRAINT billing_dashboard_snapshot_financial_year_fk FOREIGN KEY (financial_year_id) REFERENCES core_financial_years (id) ON DELETE RESTRICT
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
