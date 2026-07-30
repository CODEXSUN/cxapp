import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../database/core-database.js";
import { companyMigration, migrateCompanyModule } from "./company/company.migration.js";
import {
  defaultCompanyMigration,
  migrateDefaultCompanyModule
} from "./default-company/default-company.migration.js";
import {
  financialYearMigration,
  migrateFinancialYearModule
} from "./financial-year/financial-year.migration.js";

export const organisationMigration = {
  description: "Organisation company, financial-year, and default-company foundation.",
  key: "core.organisation.foundation-v1"
} as const;

export const organisationMigrationSteps = [
  { ...companyMigration, migrate: migrateCompanyModule },
  { ...financialYearMigration, migrate: migrateFinancialYearModule },
  { ...defaultCompanyMigration, migrate: migrateDefaultCompanyModule }
] as const;

export async function migrateOrganisationModule(database: Kysely<CoreDatabase>) {
  for (const step of organisationMigrationSteps) await step.migrate(database);
}
