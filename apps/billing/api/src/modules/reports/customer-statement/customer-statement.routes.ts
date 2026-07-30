import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { resolveBillingDatabaseName } from "../../../database/billing-database.js";
import { CustomerStatementService } from "./customer-statement.service.js";

const contactSchema = z.object({
  code: z.string(),
  gstin: z.string(),
  id: z.number().int().positive(),
  name: z.string()
});
const querySchema = z.object({
  contactId: z.coerce.number().int().positive().optional(),
  from: z.iso.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  to: z.iso.date().optional()
});
const responseSchema = z.object({
  closingBalance: z.number(),
  companyId: z.number().int().positive(),
  companyName: z.string(),
  contacts: z.array(contactSchema),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  from: z.iso.date(),
  items: z.array(
    z.object({
      balance: z.number(),
      credit: z.number(),
      date: z.iso.date(),
      debit: z.number(),
      documentId: z.string(),
      documentNumber: z.string(),
      kind: z.enum(["export-sale", "receipt", "sale"]),
      narration: z.string()
    })
  ),
  openingBalance: z.number(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  periodCredit: z.number(),
  periodDebit: z.number(),
  selectedContact: contactSchema.nullable(),
  to: z.iso.date(),
  total: z.number().int().nonnegative()
});

const service = new CustomerStatementService();

export async function registerCustomerStatementRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/reports/customer-statement",
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
