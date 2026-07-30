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
import { QuotationLookupService } from "./quotation.lookup.js";
import { QuotationService } from "./quotation.service.js";
import { saleSchema } from "../sales/index.js";

const service = new QuotationService();
const lookups = new QuotationLookupService();
const idSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}$/, "Quotation ID must be 8 hex characters.")
});
const lookupIdSchema = z.object({ id: z.string().regex(/^\d+$/, "Lookup ID must be numeric.") });
const lookupAddressIdSchema = lookupIdSchema.extend({ addressId: z.string().regex(/^\d+$/) });
const lookupBodySchema = coreLookupMutationSchema;
const lookupResponseSchema = coreLookupRecordSchema;
const statusSchema = z.enum(["draft", "confirmed", "cancelled"]);
const taxTypeSchema = z.enum(["cgst-sgst", "igst"]);
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
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  size: z.string().optional(),
  sizeId: z.number().int().positive().nullable(),
  taxId: z.number().int().positive().nullable(),
  taxRate: z.number().min(0),
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
const addressDetailsSchema = z.object({
  addressLine1: z.string(),
  addressLine2: z.string(),
  cityName: z.string(),
  districtName: z.string(),
  pincodeName: z.string(),
  stateCode: z.string(),
  stateName: z.string()
});
const quotationPayloadSchema = z.object({
  billingAddress: z.string(),
  billingAddressId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  currencyCode: z.string().trim().length(3),
  currencyId: z.number().int().positive(),
  customerEmail: z.string(),
  customerId: z.number().int().positive(),
  customerName: z.string(),
  customerPhone: z.string(),
  financialYearId: z.number().int().positive(),
  quotationNumber: z.string(),
  date: z.iso.date(),
  items: z.array(itemInputSchema),
  ledgerId: z.number().int().positive().nullable(),
  notes: z.string(),
  roundOff: z.number().optional(),
  salesLedger: z.string().optional(),
  shippingAddress: z.string(),
  shippingAddressId: z.number().int().positive(),
  status: statusSchema,
  taxType: taxTypeSchema.optional(),
  terms: z.string().optional(),
  workOrderId: z.number().int().positive().nullable(),
  workOrderNo: z.string().optional()
});
const quotationSchema = z.object({
  amount: z.number(),
  billingAddress: z.string(),
  billingAddressDetails: addressDetailsSchema,
  billingAddressId: z.number().int().positive(),
  billingStateCode: z.string(),
  billingStateName: z.string(),
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
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  generatedSalesInvoiceNo: z.string(),
  id: z.string().regex(/^[0-9a-f]{8}$/),
  quotationNumber: z.string(),
  date: z.string(),
  items: z.array(itemSchema),
  ledgerId: z.number().int().positive().nullable(),
  lineNumber: z.number().int().positive(),
  notes: z.string(),
  roundOff: z.number(),
  salesLedger: z.string(),
  shippingAddress: z.string(),
  shippingAddressDetails: addressDetailsSchema,
  shippingAddressId: z.number().int().positive(),
  shippingStateCode: z.string(),
  shippingStateName: z.string(),
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
  pageSize: z.coerce.number().int().min(10).max(200).default(100),
  search: z.string().default(""),
  status: z.enum(["all", "draft", "confirmed", "cancelled"]).default("all")
});
const quotationPageSchema = z.object({
  items: z.array(quotationSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export async function registerQuotationRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/quotations/page",
    schemas: { querystring: pageQuerySchema, response: quotationPageSchema },
    handler: ({ query, request }) => service.listPage(databaseName(request), query)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/quotations",
    schemas: { response: z.array(quotationSchema) },
    handler: ({ request }) => service.list(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/quotations/context",
    schemas: { response: contextSchema },
    handler: ({ request }) => service.getContext(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/quotations/:id",
    schemas: { params: idSchema, response: quotationSchema },
    handler: async ({ params, request }) =>
      required(await service.get(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/quotations",
    schemas: { body: quotationPayloadSchema, response: quotationSchema },
    handler: ({ body, request }) => service.create(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/quotations/:id",
    schemas: { body: quotationPayloadSchema, params: idSchema, response: quotationSchema },
    handler: async ({ body, params, request }) =>
      required(await service.update(databaseName(request), params.id, body))
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/billing/quotations/:id",
    schemas: { params: idSchema, response: quotationSchema },
    handler: async ({ params, request }) =>
      required(await service.deleteDraft(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/quotations/:id/confirm",
    schemas: { params: idSchema, response: quotationSchema },
    handler: async ({ params, request }) =>
      required(await service.confirm(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/quotations/:id/cancel",
    schemas: { params: idSchema, response: quotationSchema },
    handler: async ({ params, request }) =>
      required(await service.cancel(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/quotations/:id/revoke",
    schemas: { params: idSchema, response: quotationSchema },
    handler: async ({ params, request }) =>
      required(await service.revoke(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/quotations/:id/convert-to-sale",
    schemas: {
      params: idSchema,
      response: z.object({ quotation: quotationSchema, sale: saleSchema })
    },
    handler: async ({ params, request }) =>
      required(await service.convertToSale(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/quotations/convert-to-sale",
    schemas: {
      body: z.object({ quotationIds: z.array(z.string().regex(/^[0-9a-f]{8}$/)).min(1) }),
      response: z.object({ quotations: z.array(quotationSchema), sale: saleSchema })
    },
    handler: ({ body, request }) =>
      service.convertManyToSale(databaseName(request), body.quotationIds)
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

  get("/billing/quotations/lookups/contacts", (request) =>
    lookups.contacts(lookupHeaders(request))
  );
  get("/billing/quotations/lookups/contact-types", (request) =>
    lookups.contactTypes(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/contacts", (request, body) =>
    lookups.createContact(lookupHeaders(request), body)
  );
  put("/billing/quotations/lookups/contacts/:id", (request, id, body) =>
    lookups.updateContact(lookupHeaders(request), id, body)
  );
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/quotations/lookups/contacts/:id/addresses/:addressId",
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
    url: "/billing/quotations/lookups/contacts/:id/addresses",
    schemas: { body: lookupBodySchema, params: lookupIdSchema, response: lookupResponseSchema },
    handler: ({ body, params, request }) =>
      lookups.createContactAddress(lookupHeaders(request), params.id, body)
  });
  get("/billing/quotations/lookups/countries", (request) =>
    lookups.countries(lookupHeaders(request))
  );
  get("/billing/quotations/lookups/states", (request) => lookups.states(lookupHeaders(request)));
  post("/billing/quotations/lookups/states", (request, body) =>
    lookups.createState(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/districts", (request) =>
    lookups.districts(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/districts", (request, body) =>
    lookups.createDistrict(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/cities", (request) => lookups.cities(lookupHeaders(request)));
  post("/billing/quotations/lookups/cities", (request, body) =>
    lookups.createCity(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/pincodes", (request) =>
    lookups.pincodes(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/pincodes", (request, body) =>
    lookups.createPincode(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/address-types", (request) =>
    lookups.addressTypes(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/address-types", (request, body) =>
    lookups.createAddressType(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/products", (request) =>
    lookups.products(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/products", (request, body) =>
    lookups.createProduct(lookupHeaders(request), body)
  );
  put("/billing/quotations/lookups/products/:id", (request, id, body) =>
    lookups.updateProduct(lookupHeaders(request), id, body)
  );
  get("/billing/quotations/lookups/work-orders", (request) =>
    lookups.workOrders(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/work-orders", (request, body) =>
    lookups.createWorkOrder(lookupHeaders(request), body)
  );
  put("/billing/quotations/lookups/work-orders/:id", (request, id, body) =>
    lookups.updateWorkOrder(lookupHeaders(request), id, body)
  );
  get("/billing/quotations/lookups/colours", (request) => lookups.colours(lookupHeaders(request)));
  post("/billing/quotations/lookups/colours", (request, body) =>
    lookups.createColour(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/sizes", (request) => lookups.sizes(lookupHeaders(request)));
  post("/billing/quotations/lookups/sizes", (request, body) =>
    lookups.createSize(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/product-categories", (request) =>
    lookups.productCategories(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/product-categories", (request, body) =>
    lookups.createProductCategory(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/hsn-codes", (request) =>
    lookups.hsnCodes(lookupHeaders(request))
  );
  post("/billing/quotations/lookups/hsn-codes", (request, body) =>
    lookups.createHsnCode(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/units", (request) => lookups.units(lookupHeaders(request)));
  post("/billing/quotations/lookups/units", (request, body) =>
    lookups.createUnit(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/taxes", (request) => lookups.taxes(lookupHeaders(request)));
  post("/billing/quotations/lookups/taxes", (request, body) =>
    lookups.createTax(lookupHeaders(request), body)
  );
  get("/billing/quotations/lookups/ledgers", (request) => lookups.ledgers(lookupHeaders(request)));
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
  if (!value) throw AppError.notFound("Quotation was not found.");
  return value;
}
