import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";
import { cityMigration, migrateCityModule } from "./city/city.migration.js";
import { countryMigration, migrateCountryModule } from "./country/country.migration.js";
import { districtMigration, migrateDistrictModule } from "./district/district.migration.js";
import { migratePincodeModule, pincodeMigration } from "./pincode/pincode.migration.js";
import { migrateStateModule, stateMigration } from "./state/state.migration.js";

export const locationMigrationSteps = [
  { ...countryMigration, migrate: migrateCountryModule },
  { ...stateMigration, migrate: migrateStateModule },
  { ...districtMigration, migrate: migrateDistrictModule },
  { ...cityMigration, migrate: migrateCityModule },
  { ...pincodeMigration, migrate: migratePincodeModule }
] as const;

export async function migrateLocationModules(database: Kysely<CoreDatabase>) {
  for (const step of locationMigrationSteps) await step.migrate(database);
}
