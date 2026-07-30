import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { FinancialYearService } from "./financial-year.service.js";
import type { FinancialYearRecord } from "./financial-year.types.js";

export const FINANCIAL_YEAR_COLLECTION_PATH = "/core/organisation/financial-years";
const service = new FinancialYearService();
const idSchema = z.object({ id: z.string().regex(/^\d+$/, "Financial year ID must be numeric.") });
const statusSchema = z.enum(["active", "inactive"]);
const recordSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string().uuid(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean(),
  status: statusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
const payloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startDate: z.string().date(),
  endDate: z.string().date(),
  isCurrent: z.boolean().default(false),
  status: statusSchema.default("active")
});
const querySchema = z.object({ search: z.string().trim().optional() });

export async function registerFinancialYearRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: FINANCIAL_YEAR_COLLECTION_PATH,
    schemas: { querystring: querySchema, response: z.array(recordSchema) },
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {})
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${FINANCIAL_YEAR_COLLECTION_PATH}/current`,
    schemas: { response: recordSchema.nullable() },
    handler: () => service.current()
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${FINANCIAL_YEAR_COLLECTION_PATH}/:id`,
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params }) => required(await service.get(params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: FINANCIAL_YEAR_COLLECTION_PATH,
    schemas: { body: payloadSchema, response: recordSchema },
    handler: ({ body }) => service.create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${FINANCIAL_YEAR_COLLECTION_PATH}/:id`,
    schemas: { body: payloadSchema, params: idSchema, response: recordSchema },
    handler: async ({ body, params }) => required(await service.update(params.id, body))
  });
  lifecycle(app, "activate", (id) => service.setActive(id, true));
  lifecycle(app, "deactivate", (id) => service.setActive(id, false));
  lifecycle(app, "current", (id) => service.setCurrent(id));
  registerContractRoute(app, {
    method: "DELETE",
    url: `${FINANCIAL_YEAR_COLLECTION_PATH}/:id/force`,
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params }) => required(await service.forceDelete(params.id))
  });
}
function lifecycle(
  app: FastifyInstance,
  action: string,
  work: (id: string) => Promise<FinancialYearRecord | null>
) {
  registerContractRoute(app, {
    method: "POST",
    url: `${FINANCIAL_YEAR_COLLECTION_PATH}/:id/${action}`,
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params }) => required(await work(params.id))
  });
}
function required<T>(value: T | null): T {
  if (!value) throw AppError.notFound("Financial year was not found.");
  return value;
}
