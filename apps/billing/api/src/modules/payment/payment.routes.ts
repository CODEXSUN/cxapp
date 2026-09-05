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
import { PaymentLookupService } from "./payment.lookup.js";
import { PaymentService } from "./payment.service.js";

const service = new PaymentService();
const lookups = new PaymentLookupService();
const idSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}$/, "Payment ID must be 8 hex characters.")
});
const supplierSchema = z.object({ supplierId: z.coerce.number().int().positive() });
const lookupBodySchema = coreLookupMutationSchema;
const modeSchema = z.enum(["cash", "bank", "upi", "transfer"]);
const statusSchema = z.enum(["draft", "posted", "cancelled"]);
const allocationInputSchema = z.object({
  allocatedAmount: z.coerce.number().finite().positive(),
  purchaseId: z.string().regex(/^[0-9a-f]{8}$/)
});
const payloadSchema = z.object({
  allocations: z.array(allocationInputSchema),
  amount: z.coerce.number().finite().nonnegative(),
  companyId: z.number().int().positive(),
  currencyId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  discountAmount: z.coerce.number().finite().nonnegative(),
  financialYearId: z.number().int().positive(),
  ledgerId: z.number().int().nonnegative(),
  notes: z.string(),
  paymentDate: z.iso.date(),
  paymentMode: modeSchema,
  paymentNumber: z.string(),
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
const paymentSchema = z.object({
  numberingWarning: z.string().optional(),
  allocatedAmount: z.number(),
  allocations: z.array(allocationSchema),
  amount: z.number(),
  companyId: z.number().int().positive(),
  companyName: z.string(),
  createdAt: z.string(),
  currencyCode: z.string(),
  currencyId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  supplierName: z.string(),
  discountAmount: z.number(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  id: z.string(),
  ledgerId: z.number().int().positive(),
  ledgerName: z.string(),
  lineNumber: z.number().int().positive(),
  notes: z.string(),
  paymentDate: z.string(),
  paymentMode: modeSchema,
  paymentNumber: z.string(),
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
  suggestedPaymentNumber: z.string()
});
const candidateSchema = z.object({
  supplierId: z.number().int().positive(),
  documentDate: z.string(),
  documentNo: z.string(),
  documentTotal: z.number(),
  outstandingAmount: z.number(),
  purchaseId: z.string()
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
  pageSize: z.coerce.number().int().min(10).max(500).default(20),
  search: z.string().default(""),
  status: z.enum(["all", "draft", "posted", "cancelled"]).default("all")
});
const paymentPageSchema = z.object({
  items: z.array(paymentSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export async function registerPaymentRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/page",
    schemas: { querystring: pageQuerySchema, response: paymentPageSchema },
    handler: ({ query, request }) => service.listPage(databaseName(request), query)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments",
    schemas: { response: z.array(paymentSchema) },
    handler: ({ request }) => service.list(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/context",
    schemas: { response: contextSchema },
    handler: ({ request }) => service.context(databaseName(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/allocations",
    schemas: { querystring: supplierSchema, response: z.array(candidateSchema) },
    handler: ({ query, request }) =>
      service.allocationCandidates(databaseName(request), query.supplierId)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/contacts",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.contacts(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/contact-types",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.contactTypes(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/lookups/contacts",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createContact(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/countries",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.countries(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/states",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.states(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/lookups/states",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createState(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/districts",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.districts(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/lookups/districts",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createDistrict(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/cities",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.cities(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/lookups/cities",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createCity(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/pincodes",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.pincodes(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/lookups/pincodes",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createPincode(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/address-types",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.addressTypes(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/lookups/address-types",
    schemas: { body: lookupBodySchema, response: coreLookupRecordSchema },
    handler: ({ body, request }) => lookups.createAddressType(lookupHeaders(request), body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/lookups/ledgers",
    schemas: { response: coreLookupListSchema },
    handler: ({ request }) => lookups.ledgers(lookupHeaders(request))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/:id",
    schemas: { params: idSchema, response: paymentSchema },
    handler: async ({ params, request }) =>
      required(await service.get(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/payments/:id/activity",
    schemas: { params: idSchema, response: z.array(activitySchema) },
    handler: async ({ params, request }) =>
      required(await service.activity(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments",
    schemas: { body: payloadSchema, response: paymentSchema },
    handler: ({ body, request }) => service.create(databaseName(request), body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/payments/:id",
    schemas: { body: payloadSchema, params: idSchema, response: paymentSchema },
    handler: async ({ body, params, request }) =>
      required(await service.update(databaseName(request), params.id, body))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/:id/post",
    schemas: { params: idSchema, response: paymentSchema },
    handler: async ({ params, request }) =>
      required(await service.post(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: "/billing/payments/:id/cancel",
    schemas: { params: idSchema, response: paymentSchema },
    handler: async ({ params, request }) =>
      required(await service.cancel(databaseName(request), params.id))
  });
  registerContractRoute(app, {
    method: "DELETE",
    url: "/billing/payments/:id",
    schemas: { params: idSchema, response: paymentSchema },
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
  if (!record) throw AppError.notFound("Payment was not found.");
  return record;
}
