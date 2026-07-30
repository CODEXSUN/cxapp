import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { ProductCategoriesService } from "./product-categories.service.js";
export const PRODUCT_CATEGORIES_COLLECTION_PATH = "/core/common/products/product-categories";
const service = new ProductCategoriesService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ProductCategories ID must be numeric.")
});
const productCategoriesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const productCategoriesPayloadSchema = z.object({
  name: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const productCategoriesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerProductCategoriesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: {
      querystring: productCategoriesQuerySchema,
      response: z.array(productCategoriesSchema)
    },
    url: PRODUCT_CATEGORIES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: productCategoriesSchema },
    url: `${PRODUCT_CATEGORIES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: productCategoriesPayloadSchema, response: productCategoriesSchema },
    url: PRODUCT_CATEGORIES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: {
      body: productCategoriesPayloadSchema,
      params: idParamsSchema,
      response: productCategoriesSchema
    },
    url: `${PRODUCT_CATEGORIES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: productCategoriesSchema },
    url: `${PRODUCT_CATEGORIES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: productCategoriesSchema },
    url: `${PRODUCT_CATEGORIES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: productCategoriesSchema },
    url: `${PRODUCT_CATEGORIES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("ProductCategories record was not found.");
  return record;
}
