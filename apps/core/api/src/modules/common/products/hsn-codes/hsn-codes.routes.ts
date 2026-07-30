import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { HsnCodesService } from "./hsn-codes.service.js";
export const HSN_CODES_COLLECTION_PATH = "/core/common/products/hsn-codes";
const service = new HsnCodesService();
const idParamsSchema = z.object({ id: z.string().regex(/^\d+$/, "HsnCodes ID must be numeric.") });
const hsnCodesSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const hsnCodesPayloadSchema = z.object({
  code: z.string().trim(),
  description: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const hsnCodesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerHsnCodesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: hsnCodesQuerySchema, response: z.array(hsnCodesSchema) },
    url: HSN_CODES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: hsnCodesSchema },
    url: `${HSN_CODES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: hsnCodesPayloadSchema, response: hsnCodesSchema },
    url: HSN_CODES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: hsnCodesPayloadSchema, params: idParamsSchema, response: hsnCodesSchema },
    url: `${HSN_CODES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: hsnCodesSchema },
    url: `${HSN_CODES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: hsnCodesSchema },
    url: `${HSN_CODES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: hsnCodesSchema },
    url: `${HSN_CODES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("HsnCodes record was not found.");
  return record;
}
