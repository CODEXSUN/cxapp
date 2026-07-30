import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { ProductService } from "./product.service.js";

export const PRODUCT_COLLECTION_PATH = "/core/master/products";
const service = new ProductService();
const idSchema = z.object({ id: z.string().regex(/^\d+$/, "Product ID must be numeric.") });
const statusSchema = z.enum(["active", "inactive", "suspend", "deleted"]);
const productSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string().length(8),
  name: z.string(),
  typeId: z.number().int().nullable(),
  productCategoryId: z.number().int().nullable(),
  hsnCodeId: z.number().int().nullable(),
  unitId: z.number().int().nullable(),
  taxId: z.number().int().nullable(),
  typeName: z.string().nullable(),
  productCategoryName: z.string().nullable(),
  hsnCode: z.string().nullable(),
  unitName: z.string().nullable(),
  taxName: z.string().nullable(),
  taxRate: z.number().nullable(),
  openingStock: z.number(),
  openingRate: z.number(),
  status: statusSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable()
});
const payloadSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  typeId: z.number().int().positive().nullable().default(null),
  productCategoryId: z.number().int().positive().nullable().default(null),
  hsnCodeId: z.number().int().positive().nullable().default(null),
  unitId: z.number().int().positive().nullable().default(null),
  taxId: z.number().int().positive().nullable().default(null),
  openingStock: z.number().default(0),
  openingRate: z.number().default(0),
  status: statusSchema.default("active"),
  isActive: z.boolean().default(true)
});
const querySchema = z.object({ search: z.string().trim().optional() });

export async function registerProductRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: querySchema, response: z.array(productSchema) },
    url: PRODUCT_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.find(params.id)),
    method: "GET",
    schemas: { params: idSchema, response: productSchema },
    url: `${PRODUCT_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body }) => service.create(body),
    method: "POST",
    schemas: { body: payloadSchema, response: productSchema },
    url: PRODUCT_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: payloadSchema, params: idSchema, response: productSchema },
    url: `${PRODUCT_COLLECTION_PATH}/:id`
  });
  lifecycle(app, "activate", true);
  lifecycle(app, "deactivate", false);
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idSchema, response: productSchema },
    url: `${PRODUCT_COLLECTION_PATH}/:id/force`
  });
}
function lifecycle(app: FastifyInstance, action: "activate" | "deactivate", active: boolean) {
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, active)),
    method: "POST",
    schemas: { params: idSchema, response: productSchema },
    url: `${PRODUCT_COLLECTION_PATH}/:id/${action}`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Product was not found or is protected.");
  return record;
}
