import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { BrandsService } from "./brands.service.js";
export const BRANDS_COLLECTION_PATH = "/core/common/products/brands";
const service = new BrandsService();
const idParamsSchema = z.object({ id: z.string().regex(/^\d+$/, "Brands ID must be numeric.") });
const brandsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const brandsPayloadSchema = z.object({
  name: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const brandsQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerBrandsRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: brandsQuerySchema, response: z.array(brandsSchema) },
    url: BRANDS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: brandsSchema },
    url: `${BRANDS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: brandsPayloadSchema, response: brandsSchema },
    url: BRANDS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: brandsPayloadSchema, params: idParamsSchema, response: brandsSchema },
    url: `${BRANDS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: brandsSchema },
    url: `${BRANDS_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: brandsSchema },
    url: `${BRANDS_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: brandsSchema },
    url: `${BRANDS_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Brands record was not found.");
  return record;
}
