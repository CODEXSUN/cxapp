import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { resolveBillingDatabaseName } from "../../../database/billing-database.js";
import { GstStatementService } from "./gst-statement.service.js";

const querySchema = z.object({
  from: z.iso.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  to: z.iso.date().optional()
});
const responseSchema = z.object({
  cgstAmount: z.number(),
  companyId: z.number().int().positive(),
  companyName: z.string(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  from: z.iso.date(),
  igstAmount: z.number(),
  inwardTaxAmount: z.number(),
  inwardTaxableAmount: z.number(),
  items: z.array(
    z.object({
      cgstAmount: z.number(),
      direction: z.enum(["inward", "outward"]),
      documentCount: z.number().int().nonnegative(),
      igstAmount: z.number(),
      sgstAmount: z.number(),
      taxAmount: z.number(),
      taxableAmount: z.number(),
      taxRate: z.number()
    })
  ),
  netTaxPayable: z.number(),
  outwardTaxAmount: z.number(),
  outwardTaxableAmount: z.number(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  sgstAmount: z.number(),
  taxAmount: z.number(),
  to: z.iso.date(),
  total: z.number().int().nonnegative()
});

const service = new GstStatementService();

export async function registerGstStatementRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/reports/gst-statement",
    schemas: { querystring: querySchema, response: responseSchema },
    handler: ({ query, request }) => {
      const selectedCompanyId = companyId(request);
      return service.get(databaseName(request), {
        ...query,
        ...(selectedCompanyId ? { companyId: selectedCompanyId } : {})
      });
    }
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
