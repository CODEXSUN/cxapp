import type { FastifyInstance } from "fastify";
import { locationModule } from "./location/location.module.js";
import { addressTypesModule } from "./contacts/address-types/address-types.module.js";
import { bankNamesModule } from "./contacts/bank-names/bank-names.module.js";
import { contactGroupsModule } from "./contacts/contact-groups/contact-groups.module.js";
import { contactTypesModule } from "./contacts/contact-types/contact-types.module.js";
import { currenciesModule } from "./others/currencies/currencies.module.js";
import { monthsModule } from "./others/months/months.module.js";
import { paymentTermsModule } from "./others/payment-terms/payment-terms.module.js";
import { prioritiesModule } from "./others/priorities/priorities.module.js";
import { salesTypesModule } from "./others/sales-types/sales-types.module.js";
import { brandsModule } from "./products/brands/brands.module.js";
import { coloursModule } from "./products/colours/colours.module.js";
import { hsnCodesModule } from "./products/hsn-codes/hsn-codes.module.js";
import { productCategoriesModule } from "./products/product-categories/product-categories.module.js";
import { productGroupsModule } from "./products/product-groups/product-groups.module.js";
import { productTypesModule } from "./products/product-types/product-types.module.js";
import { sizesModule } from "./products/sizes/sizes.module.js";
import { stylesModule } from "./products/styles/styles.module.js";
import { taxesModule } from "./products/taxes/taxes.module.js";
import { unitsModule } from "./products/units/units.module.js";
import { destinationsModule } from "./workorder/destinations/destinations.module.js";
import { stockRejectionTypesModule } from "./workorder/stock-rejection-types/stock-rejection-types.module.js";
import { transportsModule } from "./workorder/transports/transports.module.js";
import { warehousesModule } from "./workorder/warehouses/warehouses.module.js";
import { workOrderTypesModule } from "./workorder/work-order-types/work-order-types.module.js";
import { ledgerGroupsModule } from "./accounts/ledger-groups/ledger-groups.module.js";
import { ledgersModule } from "./accounts/ledgers/ledgers.module.js";
const modules = [
  locationModule,
  ledgerGroupsModule,
  ledgersModule,
  addressTypesModule,
  bankNamesModule,
  contactGroupsModule,
  contactTypesModule,
  currenciesModule,
  monthsModule,
  paymentTermsModule,
  prioritiesModule,
  salesTypesModule,
  brandsModule,
  coloursModule,
  hsnCodesModule,
  productCategoriesModule,
  productGroupsModule,
  productTypesModule,
  sizesModule,
  stylesModule,
  taxesModule,
  unitsModule,
  destinationsModule,
  stockRejectionTypesModule,
  transportsModule,
  warehousesModule,
  workOrderTypesModule
];
export const commonModule = {
  key: "core.common",
  label: "Common",
  async register(app: FastifyInstance) {
    for (const module of modules) await module.register(app);
  }
};
