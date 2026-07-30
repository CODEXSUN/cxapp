import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { resolveBillingDatabaseName } from "../../database/billing-database.js";
import { DashboardService } from "./dashboard.service.js";

const metric = z.object({
  count: z.number(),
  financialYear: z.number(),
  month: z.number(),
  total: z.number()
});
const response = z.object({
  companyId: z.number().int().positive(),
  companyName: z.string(),
  financialYearEnd: z.string(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  financialYearStart: z.string(),
  metrics: z.object({ payment: metric, purchase: metric, receipt: metric, sales: metric }),
  monthly: z.array(
    z.object({
      label: z.string(),
      month: z.string(),
      payment: z.number(),
      purchase: z.number(),
      receipt: z.number(),
      sales: z.number()
    })
  ),
  outstanding: z.array(
    z.object({
      contactId: z.number().int().positive(),
      contactName: z.string(),
      creditLimit: z.number(),
      direction: z.enum(["payable", "receivable"]),
      grossAmount: z.number(),
      outstandingAmount: z.number(),
      overLimit: z.boolean(),
      settledAmount: z.number()
    })
  ),
  projectedAt: z.string(),
  projectionVersion: z.number().int().positive(),
  recent: z.array(
    z.object({
      amount: z.number(),
      contactName: z.string(),
      date: z.string(),
      documentId: z.string(),
      documentNumber: z.string(),
      kind: z.enum(["export-sales", "payment", "purchase", "receipt", "sales"]),
      status: z.string()
    })
  )
});

const service = new DashboardService();

export async function registerDashboardRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/billing/dashboard",
    schemas: { response },
    handler: async ({ request }) => {
      const snapshot = await service.get(databaseName(request), companyId(request));
      if (!snapshot)
        throw AppError.validation(
          "Configure an active Default Company and Financial Year before opening the Billing dashboard."
        );
      return snapshot;
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
