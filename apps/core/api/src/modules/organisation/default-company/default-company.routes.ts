import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { DefaultCompanyService } from "./default-company.service.js";

export const DEFAULT_COMPANY_PATH = "/core/organisation/default-company";
const service = new DefaultCompanyService();
const statusSchema = z.enum(["active", "inactive"]);
const recordSchema = z.object({
  id: z.number().int().positive(),
  companyId: z.number().int().positive(),
  companyCode: z.string(),
  companyName: z.string(),
  financialYearId: z.number().int().positive(),
  financialYearName: z.string(),
  financialYearStartDate: z.string(),
  financialYearEndDate: z.string(),
  landingApp: z.string(),
  status: statusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
const payloadSchema = z.object({
  companyId: z.number().int().positive(),
  financialYearId: z.number().int().positive(),
  landingApp: z.string().trim().min(2).max(80),
  status: statusSchema.default("active")
});
const lookupSchema = z.object({
  id: z.number().int().positive(),
  label: z.string(),
  code: z.string().optional()
});
export async function registerDefaultCompanyRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: DEFAULT_COMPANY_PATH,
    schemas: { response: recordSchema.nullable() },
    handler: () => service.get()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: DEFAULT_COMPANY_PATH,
    schemas: { body: payloadSchema, response: recordSchema },
    handler: ({ body }) => service.save(body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${DEFAULT_COMPANY_PATH}/company-lookups`,
    schemas: { response: z.array(lookupSchema) },
    handler: () => service.companyLookups()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${DEFAULT_COMPANY_PATH}/financial-year-lookups`,
    schemas: { response: z.array(lookupSchema) },
    handler: () => service.financialYearLookups()
  });
}
