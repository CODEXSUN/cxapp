import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { MonthsService } from "./months.service.js";
export const MONTHS_COLLECTION_PATH = "/core/common/others/months";
const service = new MonthsService();
const idParamsSchema = z.object({ id: z.string().regex(/^\d+$/, "Months ID must be numeric.") });
const monthsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const monthsPayloadSchema = z.object({
  name: z.string().trim(),
  startDate: z.string().trim(),
  endDate: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const monthsQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerMonthsRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: monthsQuerySchema, response: z.array(monthsSchema) },
    url: MONTHS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: monthsSchema },
    url: `${MONTHS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: monthsPayloadSchema, response: monthsSchema },
    url: MONTHS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: monthsPayloadSchema, params: idParamsSchema, response: monthsSchema },
    url: `${MONTHS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: monthsSchema },
    url: `${MONTHS_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: monthsSchema },
    url: `${MONTHS_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: monthsSchema },
    url: `${MONTHS_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Months record was not found.");
  return record;
}
