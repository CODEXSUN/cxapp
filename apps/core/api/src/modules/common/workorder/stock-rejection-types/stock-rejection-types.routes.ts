import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { StockRejectionTypesService } from "./stock-rejection-types.service.js";
export const STOCK_REJECTION_TYPES_COLLECTION_PATH = "/core/common/workorder/stock-rejection-types";
const service = new StockRejectionTypesService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "StockRejectionTypes ID must be numeric.")
});
const stockRejectionTypesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const stockRejectionTypesPayloadSchema = z.object({
  name: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const stockRejectionTypesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerStockRejectionTypesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: {
      querystring: stockRejectionTypesQuerySchema,
      response: z.array(stockRejectionTypesSchema)
    },
    url: STOCK_REJECTION_TYPES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: stockRejectionTypesSchema },
    url: `${STOCK_REJECTION_TYPES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: stockRejectionTypesPayloadSchema, response: stockRejectionTypesSchema },
    url: STOCK_REJECTION_TYPES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: {
      body: stockRejectionTypesPayloadSchema,
      params: idParamsSchema,
      response: stockRejectionTypesSchema
    },
    url: `${STOCK_REJECTION_TYPES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: stockRejectionTypesSchema },
    url: `${STOCK_REJECTION_TYPES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: stockRejectionTypesSchema },
    url: `${STOCK_REJECTION_TYPES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: stockRejectionTypesSchema },
    url: `${STOCK_REJECTION_TYPES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("StockRejectionTypes record was not found.");
  return record;
}
