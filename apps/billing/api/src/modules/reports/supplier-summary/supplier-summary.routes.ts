import { registerContractRoute } from "@cxapp/framework/http";
import { type FastifyInstance, type FastifyRequest } from "fastify";
import { z } from "zod";
import { resolveBillingDatabaseName } from "../../../database/billing-database.js";
import { SupplierSummaryService } from "./supplier-summary.service.js";

const itemSchema = z.object({
  balance: z.number(),
  code: z.string(),
  credit: z.number(),
  debit: z.number(),
  id: z.number().int().positive(),
  name: z.string()
});
const responseSchema = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  items: z.array(itemSchema),
  total: z.number().int().nonnegative(),
  totalBalance: z.number(),
  totalCredit: z.number(),
  totalDebit: z.number()
});
const service = new SupplierSummaryService();

export async function registerSupplierSummaryRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/reports/supplier-summary",
    schemas: { response: responseSchema },
    handler: ({ request }) => service.get(databaseName(request), companyId(request))
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
