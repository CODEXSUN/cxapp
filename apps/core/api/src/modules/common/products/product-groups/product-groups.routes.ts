import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { ProductGroupsService } from "./product-groups.service.js";
export const PRODUCT_GROUPS_COLLECTION_PATH = "/core/common/products/product-groups";
const service = new ProductGroupsService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ProductGroups ID must be numeric.")
});
const productGroupsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const productGroupsPayloadSchema = z.object({
  name: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const productGroupsQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerProductGroupsRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: productGroupsQuerySchema, response: z.array(productGroupsSchema) },
    url: PRODUCT_GROUPS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: productGroupsSchema },
    url: `${PRODUCT_GROUPS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: productGroupsPayloadSchema, response: productGroupsSchema },
    url: PRODUCT_GROUPS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: {
      body: productGroupsPayloadSchema,
      params: idParamsSchema,
      response: productGroupsSchema
    },
    url: `${PRODUCT_GROUPS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: productGroupsSchema },
    url: `${PRODUCT_GROUPS_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: productGroupsSchema },
    url: `${PRODUCT_GROUPS_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: productGroupsSchema },
    url: `${PRODUCT_GROUPS_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("ProductGroups record was not found.");
  return record;
}
