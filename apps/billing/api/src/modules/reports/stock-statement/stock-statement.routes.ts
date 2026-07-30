import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { resolveBillingDatabaseName } from "../../../database/billing-database.js";
import { StockStatementService } from "./stock-statement.service.js";

const querySchema = z.object({
  from: z.iso.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  search: z.string().default(""),
  to: z.iso.date().optional()
});
const responseSchema = z.object({
  closingQuantity: z.number(),
  companyId: z.number().int().positive(),
  companyName: z.string(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  from: z.iso.date(),
  inwardQuantity: z.number(),
  items: z.array(
    z.object({
      closingQuantity: z.number(),
      hsnCode: z.string(),
      inwardQuantity: z.number(),
      openingQuantity: z.number(),
      outwardQuantity: z.number(),
      productId: z.number().int().positive(),
      productName: z.string(),
      purchaseValue: z.number(),
      salesValue: z.number(),
      unitName: z.string()
    })
  ),
  openingQuantity: z.number(),
  outwardQuantity: z.number(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  purchaseValue: z.number(),
  salesValue: z.number(),
  search: z.string(),
  to: z.iso.date(),
  total: z.number().int().nonnegative()
});

const service = new StockStatementService();

export async function registerStockStatementRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/reports/stock-statement",
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
