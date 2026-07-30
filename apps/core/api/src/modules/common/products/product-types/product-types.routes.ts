import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { ProductTypesService } from "./product-types.service.js";
export const PRODUCT_TYPES_COLLECTION_PATH = "/core/common/products/product-types";
const service = new ProductTypesService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ProductTypes ID must be numeric.")
});
const productTypesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const productTypesPayloadSchema = z.object({
  name: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const productTypesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerProductTypesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: productTypesQuerySchema, response: z.array(productTypesSchema) },
    url: PRODUCT_TYPES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: productTypesSchema },
    url: `${PRODUCT_TYPES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: productTypesPayloadSchema, response: productTypesSchema },
    url: PRODUCT_TYPES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: {
      body: productTypesPayloadSchema,
      params: idParamsSchema,
      response: productTypesSchema
    },
    url: `${PRODUCT_TYPES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: productTypesSchema },
    url: `${PRODUCT_TYPES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: productTypesSchema },
    url: `${PRODUCT_TYPES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: productTypesSchema },
    url: `${PRODUCT_TYPES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("ProductTypes record was not found.");
  return record;
}
