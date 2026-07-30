import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { SalesTypesService } from "./sales-types.service.js";
export const SALES_TYPES_COLLECTION_PATH = "/core/common/others/sales-types";
const service = new SalesTypesService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "SalesTypes ID must be numeric.")
});
const salesTypesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const salesTypesPayloadSchema = z.object({
  name: z.string().trim(),
  description: z.string().trim().nullable().default(null),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const salesTypesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerSalesTypesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: salesTypesQuerySchema, response: z.array(salesTypesSchema) },
    url: SALES_TYPES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: salesTypesSchema },
    url: `${SALES_TYPES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: salesTypesPayloadSchema, response: salesTypesSchema },
    url: SALES_TYPES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: salesTypesPayloadSchema, params: idParamsSchema, response: salesTypesSchema },
    url: `${SALES_TYPES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: salesTypesSchema },
    url: `${SALES_TYPES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: salesTypesSchema },
    url: `${SALES_TYPES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: salesTypesSchema },
    url: `${SALES_TYPES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("SalesTypes record was not found.");
  return record;
}
