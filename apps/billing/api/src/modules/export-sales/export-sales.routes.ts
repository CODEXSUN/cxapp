import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "@cxapp/framework/errors";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveBillingDatabaseName } from "../../database/billing-database.js";
import {
  coreLookupListSchema,
  coreLookupMutationSchema,
  coreLookupRecordSchema
} from "../../shared/core-lookup.contracts.js";
import type { CoreLookupMutation, CoreLookupRecord } from "../../shared/core-lookup.contracts.js";
import { ExportSaleLookupService } from "./export-sales.lookup.js";
import { ExportSalesService } from "./export-sales.service.js";

const service = new ExportSalesService();
const lookups = new ExportSaleLookupService();
const idSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}$/, "Export Sale ID must be 8 hex characters.")
});
const lookupIdSchema = z.object({ id: z.string().regex(/^\d+$/, "Lookup ID must be numeric.") });
const lookupAddressIdSchema = lookupIdSchema.extend({ addressId: z.string().regex(/^\d+$/) });
const lookupBodySchema = coreLookupMutationSchema;
const lookupResponseSchema = coreLookupRecordSchema;
const statusSchema = z.enum(["draft", "confirmed", "cancelled"]);
const taxTypeSchema = z.enum(["cgst-sgst", "igst"]);
const complianceStatusSchema = z.enum(["not-generated", "generated"]);
const ewaySchema = z.object({
  billDate: z.string(),
  billNo: z.string(),
  notes: z.string(),
  part: z.enum(["Part A", "Part B"]),
  status: complianceStatusSchema,
  transport: z.string(),
  transportGst: z.string(),
  transportId: z.number().int().positive().nullable(),
  vehicleNo: z.string()
});
const einvoiceSchema = z.object({
  ackDate: z.string(),
  ackNo: z.string(),
  irn: z.string(),
  signedQr: z.string(),
  status: complianceStatusSchema
});
const itemInputSchema = z.object({
  colour: z.string().optional(),
  colourId: z.number().int().positive().nullable(),
  dcNo: z.string().optional(),
  description: z.string().trim(),
  hsnCode: z.string(),
  hsnCodeId: z.number().int().positive().nullable(),
  poNo: z.string().optional(),
  productId: z.number().int().positive().nullable(),
  productName: z.string().optional(),
  quantity: z.coerce.number().finite().positive(),
  rate: z.coerce.number().finite().nonnegative(),
  size: z.string().optional(),
  sizeId: z.number().int().positive().nullable(),
  taxId: z.number().int().positive().nullable(),
  taxRate: z.coerce.number().finite().min(0),
  unit: z.string().trim().min(1),
  unitId: z.number().int().positive()
});
const itemSchema = itemInputSchema.extend({
  cgstAmount: z.number(),
  id: z.string(),
  igstAmount: z.number(),
  lineNumber: z.number().int().positive(),
  lineTotal: z.number(),
  sgstAmount: z.number(),
  taxableAmount: z.number(),
  taxAmount: z.number()
});
const exportSalePayloadSchema = z.object({
  billingAddress: z.string(),
  billingAddressId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  currencyCode: z.string().trim().length(3),
  currencyId: z.number().int().positive(),
  customerEmail: z.string(),
  customerId: z.number().int().positive(),
  customerName: z.string(),
  customerPhone: z.string(),
  einvoice: einvoiceSchema.optional(),
  eway: ewaySchema.optional(),
  financialYearId: z.number().int().positive(),
  invoiceNumber: z.string(),
  issuedOn: z.iso.date(),
  items: z.array(itemInputSchema),
  ledgerId: z.number().int().positive().nullable(),
  notes: z.string(),
  roundOff: z.coerce.number().finite().optional(),
  salesLedger: z.string().optional(),
  shippingAddress: z.string(),
  shippingAddressId: z.number().int().positive(),
  status: statusSchema,
  taxType: taxTypeSchema.optional(),
  terms: z.string().optional(),
  workOrderId: z.number().int().positive().nullable(),
  workOrderNo: z.string().optional()
});
const exportSaleSchema = z.object({
  amount: z.number(),
  billingAddress: z.string(),
  billingAddressId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  companyName: z.string(),
  createdAt: z.string(),
  currencyCode: z.string(),
  currencyId: z.number().int().positive(),
  customerEmail: z.string(),
  customerGstin: z.string(),
  customerId: z.number().int().positive(),
  customerName: z.string(),
  customerPhone: z.string(),
  einvoice: einvoiceSchema,
  eway: ewaySchema,
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  id: z.string().regex(/^[0-9a-f]{8}$/),
  invoiceNumber: z.string(),
  issuedOn: z.string(),
  items: z.array(itemSchema),
  ledgerId: z.number().int().positive().nullable(),
  lineNumber: z.number().int().positive(),
  notes: z.string(),
  roundOff: z.number(),
  salesLedger: z.string(),
  shippingAddress: z.string(),
  shippingAddressId: z.number().int().positive(),
  status: statusSchema,
  subtotal: z.number(),
  taxAmount: z.number(),
  taxType: taxTypeSchema,
  terms: z.string(),
  updatedAt: z.string(),
  workOrderId: z.number().int().positive().nullable(),
  workOrderNo: z.string()
});
const contextSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string(),
  currencyCode: z.string(),
  currencyId: z.number().int().positive(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string()
});
const pageQuerySchema = z.object({
  customer: z.string().default("all"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(500).default(100),
  search: z.string().default(""),
  status: z.enum(["all", "draft", "confirmed", "cancelled"]).default("all")
});
const exportSalePageSchema = z.object({
  items: z.array(exportSaleSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export async function registerExportSalesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/export-sales/page",
    schemas: { querystring: pageQuerySchema, response: exportSalePageSchema },
    handler: ({ query, request }) => service.listExportSalesPage(databaseName(request), query)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/export-sales",
    schemas: { response: z.array(exportSaleSchema) },
    handler: ({ request }) => service.listExportSales(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/export-sales/context",
    schemas: { response: contextSchema },
    handler: ({ request }) => service.getContext(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/export-sales/:id",
    schemas: { params: idSchema, response: exportSaleSchema },
    handler: async ({ params, request }) =>
      required(await service.getExportSale(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/export-sales",
    schemas: { body: exportSalePayloadSchema, response: exportSaleSchema },
    handler: ({ body, request }) => service.createExportSale(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/export-sales/:id",
    schemas: { body: exportSalePayloadSchema, params: idSchema, response: exportSaleSchema },
    handler: async ({ body, params, request }) =>
      required(await service.updateExportSale(databaseName(request), params.id, body))
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/billing/export-sales/:id",
    schemas: { params: idSchema, response: exportSaleSchema },
    handler: async ({ params, request }) =>
      required(await service.deleteExportSale(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/export-sales/:id/confirm",
    schemas: { params: idSchema, response: exportSaleSchema },
    handler: async ({ params, request }) =>
      required(await service.confirmExportSale(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/export-sales/:id/cancel",
    schemas: { params: idSchema, response: exportSaleSchema },
    handler: async ({ params, request }) =>
      required(await service.cancelExportSale(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/export-sales/:id/revoke",
    schemas: { params: idSchema, response: exportSaleSchema },
    handler: async ({ params, request }) =>
      required(await service.revokeExportSale(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/export-sales/:id/einvoice/generate",
    schemas: {
      body: z.object({ einvoice: einvoiceSchema.optional() }),
      params: idSchema,
      response: exportSaleSchema
    },
    handler: async ({ body, params, request }) =>
      required(await service.generateEinvoice(databaseName(request), params.id, body.einvoice))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/export-sales/:id/eway/generate",
    schemas: {
      body: z.object({ eway: ewaySchema.optional() }),
      params: idSchema,
      response: exportSaleSchema
    },
    handler: async ({ body, params, request }) =>
      required(await service.generateEway(databaseName(request), params.id, body.eway))
  });
  registerLookupRoutes(app);
}

function registerLookupRoutes(app: FastifyInstance) {
  const get = (url: string, load: (request: FastifyRequest) => Promise<CoreLookupRecord[]>) =>
    registerContractRoute(app, {
      method: "GET",
      url,
      schemas: { response: coreLookupListSchema },
      handler: ({ request }) => load(request)
    });
  const post = (
    url: string,
    create: (request: FastifyRequest, body: CoreLookupMutation) => Promise<CoreLookupRecord>
  ) =>
    registerContractRoute(app, {
      method: "POST",
      url,
      schemas: { body: lookupBodySchema, response: lookupResponseSchema },
      handler: ({ body, request }) => create(request, body)
    });
  const put = (
    url: string,
    update: (
      request: FastifyRequest,
      id: string,
      body: CoreLookupMutation
    ) => Promise<CoreLookupRecord>
  ) =>
    registerContractRoute(app, {
      method: "PUT",
      url,
      schemas: { body: lookupBodySchema, params: lookupIdSchema, response: lookupResponseSchema },
      handler: ({ body, params, request }) => update(request, params.id, body)
    });

  get("/billing/export-sales/lookups/contacts", (request) =>
    lookups.contacts(lookupHeaders(request))
  );
  get("/billing/export-sales/lookups/contact-types", (request) =>
    lookups.contactTypes(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/contacts", (request, body) =>
    lookups.createContact(lookupHeaders(request), body)
  );
  put("/billing/export-sales/lookups/contacts/:id", (request, id, body) =>
    lookups.updateContact(lookupHeaders(request), id, body)
  );
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/export-sales/lookups/contacts/:id/addresses/:addressId",
    schemas: {
      body: lookupBodySchema,
      params: lookupAddressIdSchema,
      response: lookupResponseSchema
    },
    handler: ({ body, params, request }) =>
      lookups.updateContactAddress(lookupHeaders(request), params.id, params.addressId, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/export-sales/lookups/contacts/:id/addresses",
    schemas: { body: lookupBodySchema, params: lookupIdSchema, response: lookupResponseSchema },
    handler: ({ body, params, request }) =>
      lookups.createContactAddress(lookupHeaders(request), params.id, body)
  });
  get("/billing/export-sales/lookups/countries", (request) =>
    lookups.countries(lookupHeaders(request))
  );
  get("/billing/export-sales/lookups/states", (request) => lookups.states(lookupHeaders(request)));
  post("/billing/export-sales/lookups/states", (request, body) =>
    lookups.createState(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/districts", (request) =>
    lookups.districts(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/districts", (request, body) =>
    lookups.createDistrict(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/cities", (request) => lookups.cities(lookupHeaders(request)));
  post("/billing/export-sales/lookups/cities", (request, body) =>
    lookups.createCity(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/pincodes", (request) =>
    lookups.pincodes(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/pincodes", (request, body) =>
    lookups.createPincode(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/address-types", (request) =>
    lookups.addressTypes(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/address-types", (request, body) =>
    lookups.createAddressType(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/products", (request) =>
    lookups.products(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/products", (request, body) =>
    lookups.createProduct(lookupHeaders(request), body)
  );
  put("/billing/export-sales/lookups/products/:id", (request, id, body) =>
    lookups.updateProduct(lookupHeaders(request), id, body)
  );
  get("/billing/export-sales/lookups/work-orders", (request) =>
    lookups.workOrders(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/work-orders", (request, body) =>
    lookups.createWorkOrder(lookupHeaders(request), body)
  );
  put("/billing/export-sales/lookups/work-orders/:id", (request, id, body) =>
    lookups.updateWorkOrder(lookupHeaders(request), id, body)
  );
  get("/billing/export-sales/lookups/colours", (request) =>
    lookups.colours(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/colours", (request, body) =>
    lookups.createColour(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/sizes", (request) => lookups.sizes(lookupHeaders(request)));
  post("/billing/export-sales/lookups/sizes", (request, body) =>
    lookups.createSize(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/product-categories", (request) =>
    lookups.productCategories(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/product-categories", (request, body) =>
    lookups.createProductCategory(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/hsn-codes", (request) =>
    lookups.hsnCodes(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/hsn-codes", (request, body) =>
    lookups.createHsnCode(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/units", (request) => lookups.units(lookupHeaders(request)));
  post("/billing/export-sales/lookups/units", (request, body) =>
    lookups.createUnit(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/taxes", (request) => lookups.taxes(lookupHeaders(request)));
  post("/billing/export-sales/lookups/taxes", (request, body) =>
    lookups.createTax(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/transports", (request) =>
    lookups.transports(lookupHeaders(request))
  );
  post("/billing/export-sales/lookups/transports", (request, body) =>
    lookups.createTransport(lookupHeaders(request), body)
  );
  get("/billing/export-sales/lookups/ledgers", (request) =>
    lookups.ledgers(lookupHeaders(request))
  );
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveBillingDatabaseName(Array.isArray(value) ? value[0] : value);
}

function lookupHeaders(request: FastifyRequest) {
  return {
    authorization: request.headers.authorization,
    tenantDatabase: request.headers["x-tenant-db"],
    tenantId: request.headers["x-tenant-id"]
  };
}

function required<T>(value: T | null): T {
  if (!value) throw AppError.notFound("Export sale was not found.");
  return value;
}
