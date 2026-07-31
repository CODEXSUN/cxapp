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
import { ReceiptLookupService } from "./receipt.lookup.js";
import { ReceiptService } from "./receipt.service.js";

const service = new ReceiptService();
const lookups = new ReceiptLookupService();
const idSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}$/, "Receipt ID must be 8 hex characters.")
});
const customerSchema = z.object({ customerId: z.coerce.number().int().positive() });
const lookupBodySchema = coreLookupMutationSchema;
const modeSchema = z.enum(["cash", "bank", "upi", "transfer"]);
const statusSchema = z.enum(["draft", "posted", "cancelled"]);
const allocationInputSchema = z.object({
  allocatedAmount: z.coerce.number().finite().positive(),
  saleId: z.string().regex(/^[0-9a-f]{8}$/)
});
const payloadSchema = z.object({
  allocations: z.array(allocationInputSchema),
  amount: z.coerce.number().finite().nonnegative(),
  companyId: z.number().int().positive(),
  currencyId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  discountAmount: z.coerce.number().finite().nonnegative(),
  financialYearId: z.number().int().positive(),
  ledgerId: z.number().int().nonnegative(),
  notes: z.string(),
  receiptDate: z.iso.date(),
  receiptMode: modeSchema,
  receiptNumber: z.string(),
  referenceDate: z.union([z.iso.date(), z.literal("")]),
  referenceNo: z.string(),
  roundOff: z.coerce.number().finite(),
  tdsAmount: z.coerce.number().finite().nonnegative()
});
const allocationSchema = allocationInputSchema.extend({
  documentDate: z.string(),
  documentNo: z.string(),
  documentTotal: z.number(),
  id: z.string(),
  previousBalance: z.number()
});
const receiptSchema = z.object({
  allocatedAmount: z.number(),
  allocations: z.array(allocationSchema),
  amount: z.number(),
  companyId: z.number().int().positive(),
  companyName: z.string(),
  createdAt: z.string(),
  currencyCode: z.string(),
  currencyId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  customerName: z.string(),
  discountAmount: z.number(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  id: z.string(),
  ledgerId: z.number().int().positive(),
  ledgerName: z.string(),
  lineNumber: z.number().int().positive(),
  notes: z.string(),
  receiptDate: z.string(),
  receiptMode: modeSchema,
  receiptNumber: z.string(),
  referenceDate: z.string(),
  referenceNo: z.string(),
  roundOff: z.number(),
  status: statusSchema,
  tdsAmount: z.number(),
  totalAmount: z.number(),
  unallocatedAmount: z.number(),
  updatedAt: z.string()
});
const contextSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string(),
  currencyCode: z.string(),
  currencyId: z.number().int().positive(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  suggestedReceiptNumber: z.string()
});
const candidateSchema = z.object({
  customerId: z.number().int().positive(),
  documentDate: z.string(),
  documentNo: z.string(),
  documentTotal: z.number(),
  outstandingAmount: z.number(),
  saleId: z.string()
});
const activitySchema = z.object({
  action: z.string(),
  createdAt: z.string(),
  description: z.string(),
  id: z.string().regex(/^[0-9a-f]{8}$/),
  newStatus: statusSchema.nullable(),
  previousStatus: statusSchema.nullable()
});
const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(20),
  search: z.string().default(""),
  status: z.enum(["all", "draft", "posted", "cancelled"]).default("all")
});
const receiptPageSchema = z.object({
  items: z.array(receiptSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export async function registerReceiptRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/page",
    schemas: { querystring: pageQuerySchema, response: receiptPageSchema },
    handler: ({ query, request }) => service.listPage(databaseName(request), query)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts",
    schemas: { response: z.array(receiptSchema) },
    handler: ({ request }) => service.list(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/context",
    schemas: { response: contextSchema },
    handler: ({ request }) => service.context(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/allocations",
    schemas: { querystring: customerSchema, response: z.array(candidateSchema) },
    handler: ({ query, request }) =>
      service.allocationCandidates(databaseName(request), query.customerId)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/contacts",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.contacts(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/contact-types",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.contactTypes(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/lookups/contacts",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createContact(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/countries",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.countries(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/states",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.states(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/lookups/states",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createState(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/districts",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.districts(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/lookups/districts",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createDistrict(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/cities",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.cities(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/lookups/cities",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createCity(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/pincodes",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.pincodes(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/lookups/pincodes",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createPincode(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/address-types",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.addressTypes(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/lookups/address-types",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createAddressType(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/lookups/ledgers",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.ledgers(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/:id",
    schemas: { params: idSchema, response: receiptSchema },
    handler: async ({ params, request }) =>
      required(await service.get(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/receipts/:id/activity",
    schemas: { params: idSchema, response: z.array(activitySchema) },
    handler: async ({ params, request }) =>
      required(await service.activity(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts",
    schemas: { body: payloadSchema, response: receiptSchema },
    handler: ({ body, request }) => service.create(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/receipts/:id",
    schemas: { body: payloadSchema, params: idSchema, response: receiptSchema },
    handler: async ({ body, params, request }) =>
      required(await service.update(databaseName(request), params.id, body))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/:id/post",
    schemas: { params: idSchema, response: receiptSchema },
    handler: async ({ params, request }) =>
      required(await service.post(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/receipts/:id/cancel",
    schemas: { params: idSchema, response: receiptSchema },
    handler: async ({ params, request }) =>
      required(await service.cancel(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/billing/receipts/:id",
    schemas: { params: idSchema, response: receiptSchema },
    handler: async ({ params, request }) =>
      required(await service.deleteDraft(databaseName(request), params.id))
  });
}

function databaseName(request: FastifyRequest) {
  return resolveBillingDatabaseName(request.headers["x-tenant-db"]);
}
function lookupHeaders(request: FastifyRequest) {
  return {
    authorization: request.headers.authorization,
    tenantDatabase: request.headers["x-tenant-db"],
    tenantId: request.headers["x-tenant-id"]
  };
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Receipt was not found.");
  return record;
}
