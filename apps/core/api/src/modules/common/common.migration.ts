import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../database/core-database.js";
import { locationMigrationSteps } from "./location/location.migration.js";
import {
  addressTypesMigration,
  migrateAddressTypes
} from "./contacts/address-types/address-types.migration.js";
import {
  bankNamesMigration,
  migrateBankNames
} from "./contacts/bank-names/bank-names.migration.js";
import {
  contactGroupsMigration,
  migrateContactGroups
} from "./contacts/contact-groups/contact-groups.migration.js";
import {
  contactTypesMigration,
  migrateContactTypes
} from "./contacts/contact-types/contact-types.migration.js";
import {
  currenciesMigration,
  migrateCurrencies
} from "./others/currencies/currencies.migration.js";
import { migrateMonths, monthsMigration } from "./others/months/months.migration.js";
import {
  migratePaymentTerms,
  paymentTermsMigration
} from "./others/payment-terms/payment-terms.migration.js";
import {
  migratePriorities,
  prioritiesMigration
} from "./others/priorities/priorities.migration.js";
import {
  migrateSalesTypes,
  salesTypesMigration
} from "./others/sales-types/sales-types.migration.js";
import { brandsMigration, migrateBrands } from "./products/brands/brands.migration.js";
import { coloursMigration, migrateColours } from "./products/colours/colours.migration.js";
import { hsnCodesMigration, migrateHsnCodes } from "./products/hsn-codes/hsn-codes.migration.js";
import {
  migrateProductCategories,
  productCategoriesMigration
} from "./products/product-categories/product-categories.migration.js";
import {
  migrateProductGroups,
  productGroupsMigration
} from "./products/product-groups/product-groups.migration.js";
import {
  migrateProductTypes,
  productTypesMigration
} from "./products/product-types/product-types.migration.js";
import { migrateSizes, sizesMigration } from "./products/sizes/sizes.migration.js";
import { migrateStyles, stylesMigration } from "./products/styles/styles.migration.js";
import { migrateTaxes, taxesMigration } from "./products/taxes/taxes.migration.js";
import { migrateUnits, unitsMigration } from "./products/units/units.migration.js";
import {
  destinationsMigration,
  migrateDestinations
} from "./workorder/destinations/destinations.migration.js";
import {
  migrateStockRejectionTypes,
  stockRejectionTypesMigration
} from "./workorder/stock-rejection-types/stock-rejection-types.migration.js";
import {
  migrateTransports,
  transportsMigration
} from "./workorder/transports/transports.migration.js";
import {
  migrateWarehouses,
  warehousesMigration
} from "./workorder/warehouses/warehouses.migration.js";
import {
  migrateWorkOrderTypes,
  workOrderTypesMigration
} from "./workorder/work-order-types/work-order-types.migration.js";
import {
  ledgerGroupsMigration,
  migrateLedgerGroups
} from "./accounts/ledger-groups/ledger-groups.migration.js";
import { ledgersMigration, migrateLedgers } from "./accounts/ledgers/ledgers.migration.js";

export const commonMigration = {
  description: "Common module aggregator migrations.",
  key: "core.common.foundation-v1"
};

export const commonMigrationSteps = [
  ...locationMigrationSteps,
  { ...ledgerGroupsMigration, migrate: migrateLedgerGroups },
  { ...ledgersMigration, migrate: migrateLedgers },
  { ...addressTypesMigration, migrate: migrateAddressTypes },
  { ...bankNamesMigration, migrate: migrateBankNames },
  { ...contactGroupsMigration, migrate: migrateContactGroups },
  { ...contactTypesMigration, migrate: migrateContactTypes },
  { ...currenciesMigration, migrate: migrateCurrencies },
  { ...monthsMigration, migrate: migrateMonths },
  { ...paymentTermsMigration, migrate: migratePaymentTerms },
  { ...prioritiesMigration, migrate: migratePriorities },
  { ...salesTypesMigration, migrate: migrateSalesTypes },
  { ...brandsMigration, migrate: migrateBrands },
  { ...coloursMigration, migrate: migrateColours },
  { ...hsnCodesMigration, migrate: migrateHsnCodes },
  { ...productCategoriesMigration, migrate: migrateProductCategories },
  { ...productGroupsMigration, migrate: migrateProductGroups },
  { ...productTypesMigration, migrate: migrateProductTypes },
  { ...sizesMigration, migrate: migrateSizes },
  { ...stylesMigration, migrate: migrateStyles },
  { ...taxesMigration, migrate: migrateTaxes },
  { ...unitsMigration, migrate: migrateUnits },
  { ...destinationsMigration, migrate: migrateDestinations },
  { ...stockRejectionTypesMigration, migrate: migrateStockRejectionTypes },
  { ...transportsMigration, migrate: migrateTransports },
  { ...warehousesMigration, migrate: migrateWarehouses },
  { ...workOrderTypesMigration, migrate: migrateWorkOrderTypes }
] as const;

export async function migrateCommonModule(database: Kysely<CoreDatabase>) {
  for (const step of commonMigrationSteps) await step.migrate(database);
}
