import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createConnection, type Connection, type RowDataPacket } from "mysql2/promise";
import { env as platformEnv } from "../../apps/platform/api/src/env.js";
import { closePlatformDatabase } from "../../apps/platform/api/src/database/platform-database.js";
import { closeAllTenantDatabases } from "../../apps/platform/api/src/database/tenant-database.js";
import { SubscriptionService } from "../../apps/platform/api/src/modules/subscription/subscription.service.js";
import { TenantService } from "../../apps/platform/api/src/modules/tenant/tenant.service.js";
import type { Tenant } from "../../apps/platform/api/src/modules/tenant/tenant.types.js";
import { signAuthToken } from "../../apps/platform/api/src/auth/jwt.js";
import { createApp as createPlatformApp } from "../../apps/platform/api/src/app.js";
import { tenantDatabaseMigrationsFor } from "../../apps/platform/api/src/database/tenant-app-database.js";
import {
  bootstrapCoreDatabase,
  closeCoreDatabase,
  runWithCoreDatabase
} from "../../apps/core/api/src/database/core-database.js";
import { CityService } from "../../apps/core/api/src/modules/common/location/city/city.service.js";
import { CountryService } from "../../apps/core/api/src/modules/common/location/country/country.service.js";
import { DistrictService } from "../../apps/core/api/src/modules/common/location/district/district.service.js";
import { PincodeService } from "../../apps/core/api/src/modules/common/location/pincode/pincode.service.js";
import { StateService } from "../../apps/core/api/src/modules/common/location/state/state.service.js";
import { HsnCodesService } from "../../apps/core/api/src/modules/common/products/hsn-codes/hsn-codes.service.js";
import { TaxesService } from "../../apps/core/api/src/modules/common/products/taxes/taxes.service.js";
import { ContactService } from "../../apps/core/api/src/modules/master/contact/contact.service.js";
import { ProductService } from "../../apps/core/api/src/modules/master/product/product.service.js";
import {
  bootstrapBillingDatabase,
  closeAllBillingDatabases
} from "../../apps/billing/api/src/database/billing-database.js";
import { ExportSalesService } from "../../apps/billing/api/src/modules/export-sales/export-sales.service.js";
import type { ExportSaleSavePayload } from "../../apps/billing/api/src/modules/export-sales/export-sales.types.js";
import { PaymentService } from "../../apps/billing/api/src/modules/payment/payment.service.js";
import type { PaymentSavePayload } from "../../apps/billing/api/src/modules/payment/payment.types.js";
import { PurchaseService } from "../../apps/billing/api/src/modules/purchase/purchase.service.js";
import type { PurchaseSavePayload } from "../../apps/billing/api/src/modules/purchase/purchase.types.js";
import { QuotationService } from "../../apps/billing/api/src/modules/quotation/quotation.service.js";
import type { QuotationSavePayload } from "../../apps/billing/api/src/modules/quotation/quotation.types.js";
import { ReceiptService } from "../../apps/billing/api/src/modules/receipt/receipt.service.js";
import type { ReceiptSavePayload } from "../../apps/billing/api/src/modules/receipt/receipt.types.js";
import { SalesService } from "../../apps/billing/api/src/modules/sales/sales.service.js";
import type { SaleSavePayload } from "../../apps/billing/api/src/modules/sales/sales.types.js";

const runToken = Date.now().toString(36).slice(-6).toUpperCase();
const randomSeed = Number.parseInt(
  createHash("sha256").update(runToken).digest("hex").slice(0, 8),
  16
);
const minimumRecordsPerTenant = 8;
const maximumRecordsPerTenant = 16;
const tenantDefinitions = [
  { code: "CODEXSUN", databaseName: "codexsun_db", name: "Codexsun" },
  { code: "LOAD01", databaseName: "codexsun_load_01", name: "Load Tenant 01" },
  { code: "LOAD02", databaseName: "codexsun_load_02", name: "Load Tenant 02" },
  { code: "LOAD03", databaseName: "codexsun_load_03", name: "Load Tenant 03" },
  { code: "LOAD04", databaseName: "codexsun_load_04", name: "Load Tenant 04" }
] as const;

const admin = await createConnection({
  host: platformEnv.DB_HOST,
  password: platformEnv.DB_PASSWORD,
  port: platformEnv.DB_PORT,
  timezone: "Z",
  user: platformEnv.DB_USER
});
const tenantService = new TenantService();
const subscriptionService = new SubscriptionService();
const quotationService = new QuotationService();
const salesService = new SalesService();
const purchaseService = new PurchaseService();
const exportSalesService = new ExportSalesService();
const paymentService = new PaymentService();
const receiptService = new ReceiptService();
let platformApp: Awaited<ReturnType<typeof createPlatformApp>> | null = null;

try {
  const tenants = await provisionTenants();
  const generated = await Promise.all(tenants.map((tenant) => generateTenantLoad(tenant)));
  await verifyRandomReferenceIsolation(admin, tenants);
  const databaseAudits = [];
  let tenantSchema: SchemaColumn[] | null = null;
  for (const tenant of tenants) {
    const audit = await auditDatabase(admin, tenant.dbName);
    assert.equal(
      audit.migrationCount,
      tenantDatabaseMigrationsFor(tenant).length,
      `${tenant.tenantCode} migration ledger is incomplete.`
    );
    tenantSchema ??= audit.schema;
    assert.deepEqual(audit.schema, tenantSchema, `${tenant.tenantCode} schema drift was detected.`);
    databaseAudits.push(audit);
  }
  const masterAudit = await auditDatabase(admin, platformEnv.DB_MASTER_NAME);
  await admin.changeUser({ database: platformEnv.DB_MASTER_NAME });
  const [masterCounts] = await admin.query<Array<RowDataPacket & MasterCounts>>(`
    SELECT
      (SELECT COUNT(*) FROM tenants WHERE status='active') AS tenants,
      (SELECT COUNT(*) FROM tenant_domains domain
        INNER JOIN tenants tenant ON tenant.id=domain.tenant_id
        WHERE tenant.status='active') AS domains,
      (SELECT COUNT(*) FROM subscriptions WHERE status IN ('active','trial')) AS subscriptions
  `);
  assert.equal(Number(masterCounts[0]?.tenants), 5);
  assert.equal(Number(masterCounts[0]?.domains), 5);
  assert.equal(Number(masterCounts[0]?.subscriptions), 5);

  platformApp = await createPlatformApp();
  const routeAudit = await verifyLiveRoutes(tenants, generated);
  assert.equal(
    routeAudit.mismatchedTenantAccepted,
    false,
    "Billing accepted a mismatched x-tenant-id and x-tenant-db pair."
  );

  await closeAllBillingDatabases();
  await closeCoreDatabase();
  for (const [tenantIndex, tenant] of tenants.entries()) {
    await bootstrapCoreDatabase(tenant.dbName);
    await bootstrapBillingDatabase(tenant.dbName);
    const expected = generated[tenantIndex]?.documentCount ?? maximumRecordsPerTenant;
    assert.equal((await paymentService.list(tenant.dbName)).length >= expected, true);
    assert.equal((await receiptService.list(tenant.dbName)).length >= expected, true);
  }

  console.log("Live five-tenant mass E2E passed", {
    databaseAudits: databaseAudits.map(summarizeAudit),
    generated: generated.map((entry) => ({
      databaseName: entry.tenant.dbName,
      contacts: entry.referenceCounts.contacts,
      documents: entry.documentCount * 6,
      lineItems: entry.lineItems,
      products: entry.referenceCounts.products,
      tenantCode: entry.tenant.tenantCode
    })),
    masterAudit: summarizeAudit(masterAudit),
    randomSeed,
    recordRange: [minimumRecordsPerTenant, maximumRecordsPerTenant],
    routeAudit,
    runToken,
    tenants: tenants.length,
    totalDocuments: generated.reduce((sum, entry) => sum + entry.documentCount * 6, 0),
    totalLineItems: generated.reduce((sum, entry) => sum + entry.lineItems, 0)
  });
} finally {
  await platformApp?.close();
  await closeAllBillingDatabases();
  await closeCoreDatabase();
  await closeAllTenantDatabases();
  await closePlatformDatabase();
  await admin.end();
}

async function provisionTenants() {
  const existing = await tenantService.listTenants();
  const tenants: Tenant[] = [];
  await admin.changeUser({ database: platformEnv.DB_MASTER_NAME });
  const [plans] = await admin.query<Array<RowDataPacket & { id: number }>>(
    "SELECT id FROM plans WHERE code='starter' AND status='active' LIMIT 1"
  );
  const planId = Number(plans[0]?.id);
  assert.ok(planId, "Starter plan was not seeded.");

  for (const definition of tenantDefinitions) {
    let tenant = existing.find((entry) => entry.tenantCode === definition.code) ?? null;
    if (!tenant) {
      tenant = await tenantService.createTenant({
        corporateId: definition.code,
        dbHost: platformEnv.DB_HOST,
        dbName: definition.databaseName,
        dbPort: platformEnv.DB_PORT,
        dbSecretRef: "DB_PASSWORD",
        dbType: platformEnv.DB_DRIVER,
        dbUser: platformEnv.DB_USER,
        defaultLandingApp: "billing",
        enabledModuleKeys: ["platform.application", "billing.sales"],
        mobile: null,
        payloadSettings: {
          apps: { enabled: ["platform.application", "billing.sales"] },
          landing: { app: "billing", mode: "tenant" },
          seed: { source: "live-five-tenant-mass-e2e" }
        },
        primaryDomain: `${definition.code.toLowerCase()}.localhost`,
        slug: definition.code.toLowerCase(),
        status: "active",
        tenantCode: definition.code,
        tenantName: definition.name
      });
    }
    await admin.changeUser({ database: platformEnv.DB_MASTER_NAME });
    const [subscriptions] = await admin.query<Array<RowDataPacket & { id: number }>>(
      "SELECT id FROM subscriptions WHERE tenant_id=? AND status IN ('active','trial') LIMIT 1",
      [tenant.id]
    );
    if (!subscriptions.length) {
      await subscriptionService.createSubscription({
        billingCycle: "monthly",
        endsOn: null,
        planId,
        startsOn: new Date().toISOString().slice(0, 10),
        status: "active",
        tenantId: tenant.id
      });
    }
    const refreshed = await tenantService.getTenant(String(tenant.id));
    assert.ok(refreshed, `${definition.code} could not be reloaded.`);
    await bootstrapCoreDatabase(refreshed.dbName);
    await bootstrapBillingDatabase(refreshed.dbName);
    tenants.push(refreshed);
  }
  return tenants;
}

async function generateTenantLoad(tenant: Tenant) {
  const random = seededRandom(`${randomSeed}:${tenant.uuid}`);
  const documentCount = randomInteger(random, minimumRecordsPerTenant, maximumRecordsPerTenant);
  const tenantConnection = await createConnection({
    database: tenant.dbName,
    host: platformEnv.DB_HOST,
    password: platformEnv.DB_PASSWORD,
    port: platformEnv.DB_PORT,
    timezone: "Z",
    user: platformEnv.DB_USER
  });
  try {
    await createMassReferences(tenantConnection, tenant);
    const randomizedReferences = await createRandomizedReferences(tenantConnection, tenant, random);
    const references = await loadReferences(tenantConnection, tenant, randomizedReferences);
    const firstIds: { payment?: string; quotation?: string; receipt?: string } = {};
    let lineItems = 0;

    for (let index = 1; index <= documentCount; index += 1) {
      const customer = randomChoice(random, references.customers);
      const supplier = randomChoice(random, references.suppliers);
      const quotationItems = randomDocumentItems(references, tenant, index, "quotation", random);
      const saleItems = randomDocumentItems(references, tenant, index, "sale", random);
      const purchaseItems = randomDocumentItems(references, tenant, index, "purchase", random);
      const exportItems = randomDocumentItems(references, tenant, index, "export", random);
      lineItems +=
        quotationItems.length + saleItems.length + purchaseItems.length + exportItems.length;
      const quotation = await quotationService.create(
        tenant.dbName,
        quotationPayload(references, tenant, index, customer, quotationItems)
      );
      await quotationService.confirm(tenant.dbName, quotation.id);

      const sale = await salesService.createSale(
        tenant.dbName,
        salePayload(references, tenant, index, customer, saleItems)
      );
      await salesService.confirmSale(tenant.dbName, sale.id);

      const purchase = await purchaseService.create(
        tenant.dbName,
        purchasePayload(references, tenant, index, customer, supplier, purchaseItems)
      );
      await purchaseService.confirm(tenant.dbName, purchase.id);

      const exportSale = await exportSalesService.createExportSale(
        tenant.dbName,
        exportSalePayload(references, tenant, index, customer, exportItems)
      );
      await exportSalesService.confirmExportSale(tenant.dbName, exportSale.id);

      const payment = await paymentService.create(
        tenant.dbName,
        paymentPayload(references, tenant, index, supplier.id, purchase.id, purchase.amount)
      );
      await paymentService.post(tenant.dbName, payment.id);

      const receipt = await receiptService.create(
        tenant.dbName,
        receiptPayload(references, tenant, index, customer.id, sale.id, sale.amount)
      );
      await receiptService.post(tenant.dbName, receipt.id);

      if (index % 6 === 0) {
        await paymentService.cancel(tenant.dbName, payment.id);
        await receiptService.cancel(tenant.dbName, receipt.id);
      }
      firstIds.payment ??= payment.id;
      firstIds.quotation ??= quotation.id;
      firstIds.receipt ??= receipt.id;
    }

    const counts = await loadBillingCounts(tenantConnection, tenant.dbName);
    for (const count of Object.values(counts)) assert.ok(count >= documentCount);
    await assertRandomizedReferencesPersisted(tenantConnection, tenant, randomizedReferences);
    return {
      counts,
      documentCount,
      firstIds,
      lineItems,
      referenceCounts: {
        contacts: randomizedReferences.customers.length + randomizedReferences.suppliers.length,
        products: randomizedReferences.products.length
      },
      tenant
    };
  } finally {
    await tenantConnection.end();
  }
}

async function createMassReferences(connection: Connection, tenant: Tenant) {
  const token = stableId(tenant.uuid);
  const actorEmail = `mass-${tenant.tenantCode.toLowerCase()}@example.test`;
  await connection.query(
    `INSERT INTO users (uuid,email,name,password_hash,role,status,is_protected)
     VALUES (?,?,?,'e2e-not-login','admin','active',TRUE)
     ON DUPLICATE KEY UPDATE name=VALUES(name),role='admin',status='active',is_protected=TRUE`,
    [stableId(actorEmail), actorEmail, `${tenant.tenantName} Mass Actor`]
  );
  await connection.query(
    `INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected)
     SELECT ?,user.id,role.id,'active',TRUE FROM users user
     INNER JOIN roles role ON role.key='admin' WHERE user.email=?
     ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`,
    [stableId(`user-role:${actorEmail}:admin`), actorEmail]
  );
  await connection.query(`
    INSERT INTO contacts (uuid,code,name,status)
    VALUES ('${token.slice(0, 8)}','C-MASS','${tenant.tenantName} Mass Contact','active')
    ON DUPLICATE KEY UPDATE name=VALUES(name),status='active'
  `);
  await connection.query(`
    INSERT INTO contacts_addresses (parent_id,address_line1,is_default,sort_order)
    SELECT id,'${tenant.tenantCode} Mass Address',1,1 FROM contacts WHERE code='C-MASS'
      AND NOT EXISTS (SELECT 1 FROM contacts_addresses a WHERE a.parent_id=contacts.id AND a.is_default=1)
  `);
  await connection.query(`
    INSERT INTO work_orders (uuid,code,name,status)
    VALUES ('${stableId(`${tenant.uuid}:work`)}','WO-MASS','${tenant.tenantName} Mass Work Order','active')
    ON DUPLICATE KEY UPDATE name=VALUES(name),status='active'
  `);
  await connection.query(`
    INSERT INTO products (uuid,name,hsn_code_id,unit_id,gst_tax_id,status)
    SELECT '${stableId(`${tenant.uuid}:product`)}','${tenant.tenantName} Mass Product',
      (SELECT id FROM hsn_codes WHERE status='active' AND code<>'-' ORDER BY id LIMIT 1),
      (SELECT id FROM units WHERE status='active' AND LOWER(name)='nos' LIMIT 1),
      (SELECT id FROM taxes WHERE status='active' AND rate_percent=18 LIMIT 1),'active'
    FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE uuid='${stableId(`${tenant.uuid}:product`)}')
  `);
}

async function createRandomizedReferences(
  connection: Connection,
  tenant: Tenant,
  random: () => number
): Promise<RandomizedReferences> {
  const locationCount = randomInteger(random, 2, 4);
  const hsnCount = randomInteger(random, 2, 4);
  const taxCount = randomInteger(random, 2, 4);
  const productCount = randomInteger(random, 3, 7);
  const customerCount = randomInteger(random, 3, 6);
  const supplierCount = randomInteger(random, 3, 6);
  const token = stableId(`${tenant.uuid}:${runToken}:random`).toUpperCase();
  const countryService = new CountryService();
  const stateService = new StateService();
  const districtService = new DistrictService();
  const cityService = new CityService();
  const pincodeService = new PincodeService();
  const hsnService = new HsnCodesService();
  const taxService = new TaxesService();
  const productService = new ProductService();
  const contactService = new ContactService();

  const createLocations = async () => {
    const country = await countryService.create({
      code: `R${token.slice(0, 5)}`,
      name: `${tenant.tenantName} Random Country ${runToken}`,
      sortOrder: 800 + randomInteger(random, 1, 99),
      status: "active"
    });
    const state = await stateService.create({
      code: `RS${token.slice(0, 4)}`,
      countryId: country.id,
      name: `${tenant.tenantName} Random State ${runToken}`,
      sortOrder: 800 + randomInteger(random, 1, 99),
      status: "active"
    });
    const district = await districtService.create({
      name: `${tenant.tenantName} Random District ${runToken}`,
      sortOrder: 800 + randomInteger(random, 1, 99),
      stateId: state.id,
      status: "active"
    });
    const locations: LocationReference[] = [];
    for (let index = 1; index <= locationCount; index += 1) {
      const city = await cityService.create({
        districtId: district.id,
        name: `${tenant.tenantName} Random City ${runToken} ${index}`,
        sortOrder: 800 + index,
        status: "active"
      });
      const pincode = await pincodeService.create({
        area: `${tenant.tenantName} Random Area ${index}`,
        cityId: city.id,
        name: `${700000 + (Number.parseInt(token.slice(0, 5), 16) % 90000) + index}`,
        sortOrder: 800 + index,
        status: "active"
      });
      locations.push({ city, country, district, pincode, state });
    }
    return locations;
  };

  const createCommodities = async () => {
    const hsnCodes = [];
    for (let index = 1; index <= hsnCount; index += 1) {
      hsnCodes.push(
        await hsnService.create({
          code: `${Number.parseInt(token.slice(0, 7), 16) + index}`,
          description: `${tenant.tenantName} Random HSN ${runToken} ${index}`,
          isActive: true,
          sortOrder: 800 + index
        })
      );
    }
    const existingTaxes = await taxService.list();
    const usedRates = new Set(existingTaxes.map((tax) => Number(tax.ratePercent).toFixed(4)));
    const taxes = [];
    let candidateRate = 30 + (Number.parseInt(token.slice(0, 2), 16) % 40) + random() / 10;
    for (let index = 1; index <= taxCount; index += 1) {
      while (usedRates.has(candidateRate.toFixed(4))) candidateRate += 0.0137;
      const ratePercent = Number(candidateRate.toFixed(4));
      usedRates.add(ratePercent.toFixed(4));
      taxes.push(
        await taxService.create({
          description: `${tenant.tenantName} Random Tax ${runToken} ${index}`,
          isActive: true,
          ratePercent,
          sortOrder: 800 + index
        })
      );
      candidateRate += 0.137;
    }
    return { hsnCodes, taxes };
  };

  const [locations, commodities] = await runWithCoreDatabase(tenant.dbName, async () => {
    if (random() < 0.5) {
      const createdLocations = await createLocations();
      return [createdLocations, await createCommodities()] as const;
    }
    const createdCommodities = await createCommodities();
    return [await createLocations(), createdCommodities] as const;
  });

  const [contactTypeRows] = await connection.query<
    Array<RowDataPacket & { id: number; name: string }>
  >("SELECT id,name FROM contact_types WHERE status='active' ORDER BY id");
  assert.ok(contactTypeRows.length, `${tenant.tenantCode} has no active contact types.`);
  const customerType =
    contactTypeRows.find((entry) => /customer|client/i.test(entry.name)) ?? contactTypeRows[0]!;
  const supplierType =
    contactTypeRows.find((entry) => /supplier|vendor/i.test(entry.name)) ??
    contactTypeRows.at(1) ??
    contactTypeRows[0]!;

  return runWithCoreDatabase(tenant.dbName, async () => {
    const products: ProductReference[] = [];
    for (let index = 1; index <= productCount; index += 1) {
      const hsn = randomChoice(random, commodities.hsnCodes);
      const tax = randomChoice(random, commodities.taxes);
      const product = await productService.create({
        hsnCodeId: hsn.id,
        isActive: true,
        name: `${tenant.tenantName} Random Product ${runToken} ${index}`,
        openingRate: randomInteger(random, 10, 500),
        openingStock: randomInteger(random, 0, 500),
        status: "active",
        taxId: tax.id
      });
      assert.ok(product.unitId, "Random product did not resolve a default unit.");
      products.push({
        hsnCode: hsn.code,
        hsnCodeId: hsn.id,
        id: product.id,
        name: product.name,
        taxId: tax.id,
        taxRate: tax.ratePercent,
        unit: product.unitName ?? "Nos",
        unitId: product.unitId
      });
    }

    const createContacts = async (count: number, role: "Customer" | "Supplier") => {
      const contacts: ContactReference[] = [];
      for (let index = 1; index <= count; index += 1) {
        const location = randomChoice(random, locations);
        const type = role === "Customer" ? customerType : supplierType;
        const contact = await contactService.create({
          addresses: [
            {
              addressLine1: `${tenant.tenantName} ${role} Street ${index}`,
              addressLine2: `${location.city.name} ${runToken}`,
              addressTypeId: null,
              addressTypeName: null,
              cityId: location.city.id,
              cityName: location.city.name,
              countryId: location.country.id,
              countryName: location.country.name,
              districtId: location.district.id,
              districtName: location.district.name,
              isDefault: true,
              pincodeId: location.pincode.id,
              pincodeName: location.pincode.name,
              stateId: location.state.id,
              stateName: location.state.name
            }
          ],
          code: `${role === "Customer" ? "RC" : "RS"}-${token.slice(0, 4)}-${index}`,
          emails: [
            {
              email: `${role.toLowerCase()}-${tenant.tenantCode.toLowerCase()}-${runToken.toLowerCase()}-${index}@example.test`,
              emailType: "Work",
              isPrimary: true
            }
          ],
          isActive: true,
          legalName: `${tenant.tenantName} Random ${role} ${runToken} ${index}`,
          name: `${tenant.tenantName} Random ${role} ${runToken} ${index}`,
          phones: [
            {
              isPrimary: true,
              phone: `9${String(Number.parseInt(token.slice(0, 6), 16) + index)
                .padStart(9, "0")
                .slice(-9)}`,
              phoneType: "Mobile"
            }
          ],
          status: "active",
          typeId: type.id,
          typeName: type.name
        });
        contacts.push({
          addressId: contact.addresses[0]!.id,
          email: contact.primaryEmail ?? "",
          id: contact.id,
          name: contact.name,
          phone: contact.primaryPhone ?? ""
        });
      }
      return contacts;
    };

    const customers = await createContacts(customerCount, "Customer");
    const suppliers = await createContacts(supplierCount, "Supplier");
    const verificationOrder = shuffle(random, [
      ...locations.map((location) => () => cityService.get(String(location.city.id))),
      ...commodities.hsnCodes.map((hsn) => () => hsnService.get(String(hsn.id))),
      ...commodities.taxes.map((tax) => () => taxService.get(String(tax.id))),
      ...products.map((product) => () => productService.find(String(product.id))),
      ...customers.map((contact) => () => contactService.find(String(contact.id))),
      ...suppliers.map((contact) => () => contactService.find(String(contact.id)))
    ]);
    for (const getRecord of verificationOrder) assert.ok(await getRecord());
    return { customers, locations, products, suppliers };
  });
}

async function loadReferences(
  connection: Connection,
  tenant: Tenant,
  randomized: RandomizedReferences
): Promise<References> {
  const [rows] = await connection.query<Array<RowDataPacket & ReferenceRow>>(`
    SELECT defaults.company_id,defaults.financial_year_id,
      DATE_FORMAT(financial_year.start_date,'%Y-%m-%d') AS document_date,
      currency.id AS currency_id,contact.id AS contact_id,address.id AS address_id,
      work_order.id AS work_order_id,ledger.id AS ledger_id,product.id AS product_id,
      hsn.id AS hsn_code_id,colour.id AS colour_id,size.id AS size_id,
      unit.id AS unit_id,tax.id AS tax_id
    FROM default_company_settings defaults
    INNER JOIN financial_years financial_year ON financial_year.id=defaults.financial_year_id
    INNER JOIN currencies currency ON UPPER(currency.name)='INR' AND currency.status='active'
    INNER JOIN contacts contact ON contact.code='C-MASS'
    INNER JOIN contacts_addresses address ON address.parent_id=contact.id AND address.is_default=1
    INNER JOIN work_orders work_order ON work_order.code='WO-MASS'
    INNER JOIN ledgers ledger ON ledger.status='active' AND ledger.name<>'-'
    INNER JOIN products product ON product.uuid='${stableId(`${tenant.uuid}:product`)}'
    INNER JOIN hsn_codes hsn ON hsn.id=product.hsn_code_id
    INNER JOIN colours colour ON colour.status='active' AND colour.name<>'-'
    INNER JOIN sizes size ON size.status='active' AND size.name<>'-'
    INNER JOIN units unit ON unit.id=product.unit_id
    INNER JOIN taxes tax ON tax.id=product.gst_tax_id
    WHERE defaults.singleton_key=1 LIMIT 1
  `);
  const row = rows[0];
  assert.ok(row, `${tenant.tenantCode} did not provide the required mass-data references.`);
  return {
    addressId: Number(row.address_id),
    colourId: Number(row.colour_id),
    companyId: Number(row.company_id),
    contactId: Number(row.contact_id),
    currencyId: Number(row.currency_id),
    documentDate: String(row.document_date),
    financialYearId: Number(row.financial_year_id),
    hsnCodeId: Number(row.hsn_code_id),
    ledgerId: Number(row.ledger_id),
    productId: Number(row.product_id),
    sizeId: Number(row.size_id),
    taxId: Number(row.tax_id),
    unitId: Number(row.unit_id),
    workOrderId: Number(row.work_order_id),
    customers: randomized.customers,
    products: randomized.products,
    suppliers: randomized.suppliers
  };
}

function documentBase(
  references: References,
  tenant: Tenant,
  index: number,
  contact: ContactReference,
  items: RandomDocumentItem[]
) {
  return {
    billingAddress: `${contact.name} persisted address`,
    billingAddressId: contact.addressId,
    companyId: references.companyId,
    currencyCode: "INR",
    currencyId: references.currencyId,
    customerEmail: contact.email,
    customerId: contact.id,
    customerName: contact.name,
    customerPhone: contact.phone,
    financialYearId: references.financialYearId,
    items,
    ledgerId: references.ledgerId,
    notes: `Live mass E2E ${runToken}`,
    roundOff: 0,
    salesLedger: "General Ledger",
    shippingAddress: `${contact.name} persisted address`,
    shippingAddressId: contact.addressId,
    status: "draft" as const,
    taxType: "cgst-sgst" as const,
    terms: "Live mass E2E terms",
    workOrderId: references.workOrderId,
    workOrderNo: "WO-MASS"
  };
}

function quotationPayload(
  references: References,
  tenant: Tenant,
  index: number,
  customer: ContactReference,
  items: RandomDocumentItem[]
): QuotationSavePayload {
  return {
    ...documentBase(references, tenant, index, customer, items),
    date: references.documentDate,
    quotationNumber: number("QT", tenant, index)
  };
}

function salePayload(
  references: References,
  tenant: Tenant,
  index: number,
  customer: ContactReference,
  items: RandomDocumentItem[]
): SaleSavePayload {
  return {
    ...documentBase(references, tenant, index, customer, items),
    invoiceNumber: number("INV", tenant, index),
    issuedOn: references.documentDate
  };
}

function purchasePayload(
  references: References,
  tenant: Tenant,
  index: number,
  customer: ContactReference,
  supplier: ContactReference,
  items: RandomDocumentItem[]
): PurchaseSavePayload {
  const base = documentBase(references, tenant, index, customer, items);
  return {
    ...base,
    billingAddress: `${supplier.name} persisted address`,
    billingAddressId: supplier.addressId,
    invoiceNumber: number("PUR", tenant, index),
    issuedOn: references.documentDate,
    shippingAddress: `${supplier.name} persisted address`,
    shippingAddressId: supplier.addressId,
    supplierBillDate: references.documentDate,
    supplierBillNo: number("SB", tenant, index),
    supplierEmail: supplier.email,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierPhone: supplier.phone
  };
}

function exportSalePayload(
  references: References,
  tenant: Tenant,
  index: number,
  customer: ContactReference,
  items: RandomDocumentItem[]
): ExportSaleSavePayload {
  return {
    ...documentBase(references, tenant, index, customer, items),
    invoiceNumber: number("EXP", tenant, index),
    issuedOn: references.documentDate
  };
}

function paymentPayload(
  references: References,
  tenant: Tenant,
  index: number,
  supplierId: number,
  purchaseId: string,
  amount: number
): PaymentSavePayload {
  return {
    allocations: [{ allocatedAmount: amount, purchaseId }],
    amount,
    companyId: references.companyId,
    currencyId: references.currencyId,
    discountAmount: 0,
    financialYearId: references.financialYearId,
    ledgerId: references.ledgerId,
    notes: `Live mass payment ${runToken}`,
    paymentDate: references.documentDate,
    paymentMode: "bank",
    paymentNumber: number("PAY", tenant, index),
    referenceDate: references.documentDate,
    referenceNo: number("PREF", tenant, index),
    roundOff: 0,
    supplierId,
    tdsAmount: 0
  };
}

function receiptPayload(
  references: References,
  tenant: Tenant,
  index: number,
  customerId: number,
  saleId: string,
  amount: number
): ReceiptSavePayload {
  return {
    allocations: [{ allocatedAmount: amount, saleId }],
    amount,
    companyId: references.companyId,
    currencyId: references.currencyId,
    customerId,
    discountAmount: 0,
    financialYearId: references.financialYearId,
    ledgerId: references.ledgerId,
    notes: `Live mass receipt ${runToken}`,
    receiptDate: references.documentDate,
    receiptMode: "bank",
    receiptNumber: number("REC", tenant, index),
    referenceDate: references.documentDate,
    referenceNo: number("RREF", tenant, index),
    roundOff: 0,
    tdsAmount: 0
  };
}

function randomDocumentItems(
  references: References,
  tenant: Tenant,
  documentIndex: number,
  documentKind: string,
  random: () => number
): RandomDocumentItem[] {
  const lineCount = randomInteger(random, 1, 24);
  return Array.from({ length: lineCount }, (_, lineIndex) => {
    const product = randomChoice(random, references.products);
    return {
      colour: "Blue",
      colourId: references.colourId,
      description: `${tenant.tenantCode} ${documentKind} ${runToken} ${documentIndex}-${lineIndex + 1}`,
      hsnCode: product.hsnCode,
      hsnCodeId: product.hsnCodeId,
      productId: product.id,
      productName: product.name,
      quantity: randomInteger(random, 1, 50),
      rate: randomInteger(random, 10, 5_000) + randomInteger(random, 0, 99) / 100,
      size: "M",
      sizeId: references.sizeId,
      taxId: product.taxId,
      taxRate: product.taxRate,
      unit: product.unit,
      unitId: product.unitId
    };
  });
}

async function assertRandomizedReferencesPersisted(
  connection: Connection,
  tenant: Tenant,
  references: RandomizedReferences
) {
  await connection.changeUser({ database: tenant.dbName });
  const [rows] = await connection.query<Array<RowDataPacket & RandomReferenceCounts>>(
    `SELECT
      (SELECT COUNT(*) FROM contacts WHERE name LIKE ?) AS contacts,
      (SELECT COUNT(*) FROM products WHERE name LIKE ?) AS products,
      (SELECT COUNT(*) FROM hsn_codes WHERE description LIKE ?) AS hsn_codes,
      (SELECT COUNT(*) FROM taxes WHERE description LIKE ?) AS taxes,
      (SELECT COUNT(*) FROM cities WHERE name LIKE ?) AS cities`,
    Array(5).fill(`%${runToken}%`)
  );
  const counts = rows[0];
  assert.ok(counts, `${tenant.tenantCode} randomized references could not be counted.`);
  assert.equal(
    Number(counts.contacts),
    references.customers.length + references.suppliers.length,
    `${tenant.tenantCode} randomized contacts did not persist.`
  );
  assert.equal(Number(counts.products), references.products.length);
  assert.equal(Number(counts.cities), references.locations.length);
  assert.ok(Number(counts.hsn_codes) >= 2);
  assert.ok(Number(counts.taxes) >= 2);
}

async function verifyRandomReferenceIsolation(connection: Connection, tenants: Tenant[]) {
  for (const tenant of tenants) {
    await connection.changeUser({ database: tenant.dbName });
    for (const otherTenant of tenants) {
      if (otherTenant.id === tenant.id) continue;
      const [rows] = await connection.query<Array<RowDataPacket & { count: number }>>(
        `SELECT
          (SELECT COUNT(*) FROM contacts WHERE name LIKE ?) +
          (SELECT COUNT(*) FROM products WHERE name LIKE ?) AS count`,
        [
          `${otherTenant.tenantName} Random % ${runToken}%`,
          `${otherTenant.tenantName} Random % ${runToken}%`
        ]
      );
      assert.equal(
        Number(rows[0]?.count ?? 0),
        0,
        `${tenant.tenantCode} contains randomized master data from ${otherTenant.tenantCode}.`
      );
    }
  }
}

async function verifyLiveRoutes(
  tenants: Tenant[],
  generated: Array<Awaited<ReturnType<typeof generateTenantLoad>>>
) {
  assert.ok(platformApp);
  for (const [index, tenant] of tenants.entries()) {
    const expected = generated[index]?.documentCount ?? maximumRecordsPerTenant;
    for (const path of [
      "/billing/quotations/page?page=1&pageSize=200&search=&status=all&customer=all",
      "/billing/sales/page?page=1&pageSize=200&search=&status=all",
      "/billing/purchases/page?page=1&pageSize=200&search=&status=all&customer=all",
      "/billing/export-sales/page?page=1&pageSize=200&search=&status=all&customer=all",
      "/billing/payments/page?page=1&pageSize=200&search=&status=all",
      "/billing/receipts/page?page=1&pageSize=200&search=&status=all"
    ]) {
      const response = await platformApp.inject({
        headers: tenantHeaders(tenant),
        method: "GET",
        url: path
      });
      assert.equal(response.statusCode, 200, response.body);
      const page = (response.json() as { data: { items: unknown[]; total: number } }).data;
      assert.ok(
        page.total >= expected,
        `${tenant.tenantCode} ${path} returned an incomplete total.`
      );
      assert.ok(page.items.length <= 200, `${tenant.tenantCode} ${path} exceeded its page size.`);
    }
  }
  const source = generated[0];
  const target = tenants[1];
  assert.ok(source?.firstIds.payment && target);
  const isolated = await platformApp.inject({
    headers: tenantHeaders(target),
    method: "GET",
    url: `/billing/payments/${source.firstIds.payment}`
  });
  assert.equal(isolated.statusCode, 404, isolated.body);
  const mismatched = await platformApp.inject({
    headers: {
      ...tenantHeaders(target),
      "x-tenant-db": source.tenant.dbName
    },
    method: "GET",
    url: "/billing/payments/page?page=1&pageSize=20&search=&status=all"
  });
  return {
    crossTenantRecordStatus: isolated.statusCode,
    mismatchedTenantAccepted: mismatched.statusCode === 200
  };
}

function tenantHeaders(tenant: Tenant) {
  const token = signAuthToken({
    email: `mass-${tenant.tenantCode.toLowerCase()}@example.test`,
    tenantCode: tenant.tenantCode,
    tenantDbName: tenant.dbName,
    tenantId: tenant.uuid,
    tenantUuid: tenant.uuid,
    userId: `mass-${tenant.uuid}`,
    userType: "tenant"
  });
  return {
    authorization: `Bearer ${token}`,
    "x-tenant-db": tenant.dbName,
    "x-tenant-id": tenant.uuid
  };
}

async function loadBillingCounts(connection: Connection, databaseName: string) {
  await connection.changeUser({ database: databaseName });
  const [rows] = await connection.query<Array<RowDataPacket & BillingCounts>>(`
    SELECT
      (SELECT COUNT(*) FROM billing_quotations WHERE deleted_at IS NULL) AS quotations,
      (SELECT COUNT(*) FROM billing_sales WHERE deleted_at IS NULL) AS sales,
      (SELECT COUNT(*) FROM billing_purchases WHERE deleted_at IS NULL) AS purchases,
      (SELECT COUNT(*) FROM billing_export_sales WHERE deleted_at IS NULL) AS export_sales,
      (SELECT COUNT(*) FROM billing_payments WHERE deleted_at IS NULL) AS payments,
      (SELECT COUNT(*) FROM billing_receipts WHERE deleted_at IS NULL) AS receipts
  `);
  const row = rows[0];
  assert.ok(row);
  return {
    exportSales: Number(row.export_sales),
    payments: Number(row.payments),
    purchases: Number(row.purchases),
    quotations: Number(row.quotations),
    receipts: Number(row.receipts),
    sales: Number(row.sales)
  };
}

async function auditDatabase(connection: Connection, databaseName: string): Promise<DatabaseAudit> {
  assert.match(databaseName, /^[a-zA-Z0-9_]+$/);
  await connection.changeUser({ database: databaseName });
  const [tableRows] = await connection.query<Array<RowDataPacket & { table_name: string }>>(
    "SELECT TABLE_NAME AS table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
    [databaseName]
  );
  const rowCounts: Record<string, number> = {};
  for (const { table_name: tableName } of tableRows) {
    assert.match(tableName, /^[a-zA-Z0-9_]+$/);
    const [countRows] = await connection.query<Array<RowDataPacket & { row_count: number }>>(
      `SELECT COUNT(*) AS row_count FROM \`${tableName}\``
    );
    rowCounts[tableName] = Number(countRows[0]?.row_count ?? 0);
    const [checks] = await connection.query<Array<RowDataPacket & { Msg_text: string }>>(
      `CHECK TABLE \`${tableName}\` QUICK`
    );
    assert.equal(checks.at(-1)?.Msg_text, "OK", `${databaseName}.${tableName} check failed.`);
  }
  const [foreignKeys] = await connection.query<Array<RowDataPacket & ForeignKeyRow>>(
    `SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name,
      REFERENCED_TABLE_NAME AS referenced_table_name,REFERENCED_COLUMN_NAME AS referenced_column_name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION`,
    [databaseName]
  );
  for (const foreignKey of foreignKeys) {
    for (const value of Object.values(foreignKey)) assert.match(String(value), /^[a-zA-Z0-9_]+$/);
    const [orphans] = await connection.query<Array<RowDataPacket & { orphan_count: number }>>(`
      SELECT COUNT(*) AS orphan_count
      FROM \`${foreignKey.table_name}\` child
      LEFT JOIN \`${foreignKey.referenced_table_name}\` parent
        ON parent.\`${foreignKey.referenced_column_name}\`=child.\`${foreignKey.column_name}\`
      WHERE child.\`${foreignKey.column_name}\` IS NOT NULL
        AND parent.\`${foreignKey.referenced_column_name}\` IS NULL
    `);
    assert.equal(Number(orphans[0]?.orphan_count ?? 0), 0, `${databaseName} has orphan rows.`);
  }
  const [schema] = await connection.query<Array<RowDataPacket & SchemaColumn>>(
    `SELECT TABLE_NAME AS tableName,COLUMN_NAME AS columnName,COLUMN_TYPE AS columnType,
      IS_NULLABLE AS isNullable,COALESCE(COLUMN_DEFAULT,'<null>') AS columnDefault,
      EXTRA AS extra,ORDINAL_POSITION AS ordinalPosition
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,ORDINAL_POSITION`,
    [databaseName]
  );
  return {
    databaseName,
    emptyTables: Object.entries(rowCounts)
      .filter(([, count]) => count === 0)
      .map(([tableName]) => tableName),
    foreignKeys: foreignKeys.length,
    migrationCount: rowCounts.schema_migrations ?? 0,
    rowCounts,
    schema,
    tables: tableRows.length
  };
}

function summarizeAudit(audit: DatabaseAudit) {
  return {
    databaseName: audit.databaseName,
    emptyTables: audit.emptyTables,
    foreignKeys: audit.foreignKeys,
    migrationCount: audit.migrationCount,
    rows: Object.values(audit.rowCounts).reduce((sum, count) => sum + count, 0),
    tables: audit.tables
  };
}

function number(prefix: string, tenant: Tenant, index: number) {
  return `${prefix}-${tenant.tenantCode}-${runToken}-${String(index).padStart(3, "0")}`;
}

function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function seededRandom(value: string) {
  let state = Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 8), 16);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomInteger(random: () => number, minimum: number, maximum: number) {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

function randomChoice<T>(random: () => number, values: readonly T[]) {
  const value = values[Math.floor(random() * values.length)];
  assert.ok(value, "Randomized E2E cannot choose from an empty collection.");
  return value;
}

function shuffle<T>(random: () => number, values: T[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = randomInteger(random, 0, index);
    [values[index], values[target]] = [values[target]!, values[index]!];
  }
  return values;
}

type References = {
  addressId: number;
  colourId: number;
  companyId: number;
  contactId: number;
  currencyId: number;
  documentDate: string;
  financialYearId: number;
  hsnCodeId: number;
  ledgerId: number;
  productId: number;
  sizeId: number;
  taxId: number;
  unitId: number;
  workOrderId: number;
  customers: ContactReference[];
  products: ProductReference[];
  suppliers: ContactReference[];
};
type ContactReference = {
  addressId: number;
  email: string;
  id: number;
  name: string;
  phone: string;
};
type ProductReference = {
  hsnCode: string;
  hsnCodeId: number;
  id: number;
  name: string;
  taxId: number;
  taxRate: number;
  unit: string;
  unitId: number;
};
type LocationReference = {
  city: { id: number; name: string };
  country: { id: number; name: string };
  district: { id: number; name: string };
  pincode: { id: number; name: string };
  state: { id: number; name: string };
};
type RandomizedReferences = {
  customers: ContactReference[];
  locations: LocationReference[];
  products: ProductReference[];
  suppliers: ContactReference[];
};
type RandomDocumentItem = {
  colour: string;
  colourId: number;
  description: string;
  hsnCode: string;
  hsnCodeId: number;
  productId: number;
  productName: string;
  quantity: number;
  rate: number;
  size: string;
  sizeId: number;
  taxId: number;
  taxRate: number;
  unit: string;
  unitId: number;
};
type RandomReferenceCounts = {
  cities: number;
  contacts: number;
  hsn_codes: number;
  products: number;
  taxes: number;
};
type ReferenceRow = {
  address_id: number;
  colour_id: number;
  company_id: number;
  contact_id: number;
  currency_id: number;
  document_date: string;
  financial_year_id: number;
  hsn_code_id: number;
  ledger_id: number;
  product_id: number;
  size_id: number;
  tax_id: number;
  unit_id: number;
  work_order_id: number;
};
type MasterCounts = { domains: number; subscriptions: number; tenants: number };
type BillingCounts = {
  export_sales: number;
  payments: number;
  purchases: number;
  quotations: number;
  receipts: number;
  sales: number;
};
type ForeignKeyRow = {
  column_name: string;
  referenced_column_name: string;
  referenced_table_name: string;
  table_name: string;
};
type SchemaColumn = {
  columnDefault: string;
  columnName: string;
  columnType: string;
  extra: string;
  isNullable: string;
  ordinalPosition: number;
  tableName: string;
};
type DatabaseAudit = {
  databaseName: string;
  emptyTables: string[];
  foreignKeys: number;
  migrationCount: number;
  rowCounts: Record<string, number>;
  schema: SchemaColumn[];
  tables: number;
};
