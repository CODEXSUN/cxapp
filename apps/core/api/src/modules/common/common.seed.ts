import { seedLocationModules } from "./location/location.seed.js";
import { seedAddressTypes } from "./contacts/address-types/address-types.seed.js";
import { seedBankNames } from "./contacts/bank-names/bank-names.seed.js";
import { seedContactGroups } from "./contacts/contact-groups/contact-groups.seed.js";
import { seedContactTypes } from "./contacts/contact-types/contact-types.seed.js";
import { seedCurrencies } from "./others/currencies/currencies.seed.js";
import { seedMonths } from "./others/months/months.seed.js";
import { seedPaymentTerms } from "./others/payment-terms/payment-terms.seed.js";
import { seedPriorities } from "./others/priorities/priorities.seed.js";
import { seedSalesTypes } from "./others/sales-types/sales-types.seed.js";
import { seedBrands } from "./products/brands/brands.seed.js";
import { seedColours } from "./products/colours/colours.seed.js";
import { seedHsnCodes } from "./products/hsn-codes/hsn-codes.seed.js";
import { seedProductCategories } from "./products/product-categories/product-categories.seed.js";
import { seedProductGroups } from "./products/product-groups/product-groups.seed.js";
import { seedProductTypes } from "./products/product-types/product-types.seed.js";
import { seedSizes } from "./products/sizes/sizes.seed.js";
import { seedStyles } from "./products/styles/styles.seed.js";
import { seedTaxes } from "./products/taxes/taxes.seed.js";
import { seedUnits } from "./products/units/units.seed.js";
import { seedDestinations } from "./workorder/destinations/destinations.seed.js";
import { seedStockRejectionTypes } from "./workorder/stock-rejection-types/stock-rejection-types.seed.js";
import { seedTransports } from "./workorder/transports/transports.seed.js";
import { seedWarehouses } from "./workorder/warehouses/warehouses.seed.js";
import { seedWorkOrderTypes } from "./workorder/work-order-types/work-order-types.seed.js";
import { seedLedgerGroups } from "./accounts/ledger-groups/ledger-groups.seed.js";
import { seedLedgers } from "./accounts/ledgers/ledgers.seed.js";

export const commonSeed = {
  description: "Common module aggregator seed behavior.",
  key: "core.common.seed"
};
export async function seedCommonModule() {
  await seedLocationModules();
  await seedLedgerGroups();
  await seedLedgers();
  await seedAddressTypes();
  await seedBankNames();
  await seedContactGroups();
  await seedContactTypes();
  await seedCurrencies();
  await seedMonths();
  await seedPaymentTerms();
  await seedPriorities();
  await seedSalesTypes();
  await seedBrands();
  await seedColours();
  await seedHsnCodes();
  await seedProductCategories();
  await seedProductGroups();
  await seedProductTypes();
  await seedSizes();
  await seedStyles();
  await seedTaxes();
  await seedUnits();
  await seedDestinations();
  await seedStockRejectionTypes();
  await seedTransports();
  await seedWarehouses();
  await seedWorkOrderTypes();
}
