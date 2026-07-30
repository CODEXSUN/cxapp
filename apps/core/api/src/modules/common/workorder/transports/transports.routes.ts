import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { TransportsService } from "./transports.service.js";
export const TRANSPORTS_COLLECTION_PATH = "/core/common/workorder/transports";
const service = new TransportsService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "Transports ID must be numeric.")
});
const transportsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  gst: z.string().nullable(),
  vehicleNo: z.string().nullable(),
  address: z.string().nullable(),
  contactNo: z.string().nullable(),
  contactPerson: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const transportsPayloadSchema = z.object({
  name: z.string().trim(),
  gst: z.string().trim().nullable().default(null),
  vehicleNo: z.string().trim().nullable().default(null),
  address: z.string().trim().nullable().default(null),
  contactNo: z.string().trim().nullable().default(null),
  contactPerson: z.string().trim().nullable().default(null),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const transportsQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerTransportsRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: transportsQuerySchema, response: z.array(transportsSchema) },
    url: TRANSPORTS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: transportsSchema },
    url: `${TRANSPORTS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: transportsPayloadSchema, response: transportsSchema },
    url: TRANSPORTS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: transportsPayloadSchema, params: idParamsSchema, response: transportsSchema },
    url: `${TRANSPORTS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: transportsSchema },
    url: `${TRANSPORTS_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: transportsSchema },
    url: `${TRANSPORTS_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: transportsSchema },
    url: `${TRANSPORTS_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Transports record was not found.");
  return record;
}
