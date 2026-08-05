import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@cxapp/framework/http";
import { resolveBillingDatabaseName } from "../../../database/billing-database.js";
import { GstStatementService } from "./gst-statement.service.js";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2200).optional()
});

const filingPayloadSchema = z.object({
  gstr1Arn: z.string().trim().max(80),
  gstr1FiledOn: z.iso.date().nullable(),
  gstr3bArn: z.string().trim().max(80),
  gstr3bFiledOn: z.iso.date().nullable(),
  month: z.number().int().min(1).max(12),
  openingBalance: z.number().finite(),
  year: z.number().int().min(2000).max(2200)
});

const filingSchema = filingPayloadSchema.omit({ month: true, year: true }).extend({
  updatedAt: z.string().nullable()
});

const documentSchema = z.object({
  cgstAmount: z.number(),
  contactName: z.string(),
  documentDate: z.iso.date(),
  documentNumber: z.string(),
  documentType: z.enum(["sale", "export-sale", "purchase"]),
  gstin: z.string(),
  igstAmount: z.number(),
  invoiceTotal: z.number(),
  serial: z.number().int().positive(),
  sgstAmount: z.number(),
  taxableAmount: z.number(),
  taxRates: z.array(z.number())
});

const hsnSchema = z.object({
  cgstAmount: z.number(),
  hsnCode: z.string(),
  igstAmount: z.number(),
  productName: z.string(),
  sgstAmount: z.number(),
  taxableAmount: z.number(),
  totalQuantity: z.number()
});

const panelSchema = z.object({
  cgstAmount: z.number(),
  documentCount: z.number().int().nonnegative(),
  documents: z.array(documentSchema),
  hsn: z.array(hsnSchema),
  igstAmount: z.number(),
  invoiceTotal: z.number(),
  sgstAmount: z.number(),
  taxAmount: z.number(),
  taxableAmount: z.number()
});

const responseSchema = z.object({
  availableYears: z.array(z.number().int()),
  companyGstin: z.string(),
  companyId: z.number().int().positive(),
  companyName: z.string(),
  filing: filingSchema,
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  from: z.iso.date(),
  month: z.number().int().min(1).max(12),
  monthLabel: z.string(),
  purchases: panelSchema,
  sales: panelSchema,
  summary: z.object({
    balance: z.number(),
    openingBalance: z.number(),
    purchaseTax: z.number(),
    salesTax: z.number()
  }),
  to: z.iso.date(),
  year: z.number().int()
});

const service = new GstStatementService();

export async function registerGstStatementRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/reports/gst-statement",
    schemas: { querystring: querySchema, response: responseSchema },
    handler: ({ query, request }) =>
      service.get(databaseName(request), {
        ...query,
        ...(companyId(request) ? { companyId: companyId(request) } : {})
      })
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/billing/reports/gst-statement/filing",
    schemas: { body: filingPayloadSchema, response: filingSchema },
    handler: ({ body, request }) =>
      service.saveFiling(databaseName(request), body, companyId(request))
  });
}

function databaseName(request: FastifyRequest) {
  const value = request.headers["x-tenant-db"];
  return resolveBillingDatabaseName(Array.isArray(value) ? value[0] : value);
}

function companyId(request: FastifyRequest) {
  const value = request.headers["x-company-id"];
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
