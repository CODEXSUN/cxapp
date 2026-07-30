import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { PrioritiesService } from "./priorities.service.js";
export const PRIORITIES_COLLECTION_PATH = "/core/common/others/priorities";
const service = new PrioritiesService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "Priorities ID must be numeric.")
});
const prioritiesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  colour: z.string(),
  tag: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const prioritiesPayloadSchema = z.object({
  name: z.string().trim(),
  colour: z.string().trim(),
  tag: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const prioritiesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerPrioritiesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: prioritiesQuerySchema, response: z.array(prioritiesSchema) },
    url: PRIORITIES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: prioritiesSchema },
    url: `${PRIORITIES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: prioritiesPayloadSchema, response: prioritiesSchema },
    url: PRIORITIES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: prioritiesPayloadSchema, params: idParamsSchema, response: prioritiesSchema },
    url: `${PRIORITIES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: prioritiesSchema },
    url: `${PRIORITIES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: prioritiesSchema },
    url: `${PRIORITIES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: prioritiesSchema },
    url: `${PRIORITIES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Priorities record was not found.");
  return record;
}
