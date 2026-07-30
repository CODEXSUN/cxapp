import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { StateService } from "./state.service.js";

export const STATE_COLLECTION_PATH = "/core/common/location/states";

const service = new StateService();
const idParamsSchema = z.object({ id: z.string().regex(/^\d+$/, "State ID must be numeric.") });
const stateStatusSchema = z.enum(["active", "inactive"]);
const stateSchema = z.object({
  id: z.number().int().positive(),
  countryId: z.number().int().positive(),
  countryName: z.string(),
  code: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  status: stateStatusSchema
});
const statePayloadSchema = stateSchema.omit({ id: true, countryName: true });
const stateQuerySchema = z.object({
  countryId: z.string().regex(/^\d+$/).optional(),
  search: z.string().trim().optional()
});

export async function registerStateRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) =>
      service.list({
        ...(query.countryId ? { countryId: query.countryId } : {}),
        ...(query.search ? { search: query.search } : {})
      }),
    method: "GET",
    schemas: { querystring: stateQuerySchema, response: z.array(stateSchema) },
    url: STATE_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => {
      const record = await service.get(params.id);
      if (!record) throw AppError.notFound("State was not found.");
      return record;
    },
    method: "GET",
    schemas: { params: idParamsSchema, response: stateSchema },
    url: `${STATE_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body }) => service.create(body),
    method: "POST",
    schemas: { body: statePayloadSchema, response: stateSchema },
    url: STATE_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: ({ body, params }) => service.update(params.id, body),
    method: "PUT",
    schemas: { body: statePayloadSchema, params: idParamsSchema, response: stateSchema },
    url: `${STATE_COLLECTION_PATH}/:id`
  });
  registerStatusRoute(app, "activate", "active");
  registerStatusRoute(app, "deactivate", "inactive");
  registerContractRoute(app, {
    handler: ({ params }) => service.forceDelete(params.id),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: stateSchema },
    url: `${STATE_COLLECTION_PATH}/:id/force`
  });
}

function registerStatusRoute(
  app: FastifyInstance,
  action: "activate" | "deactivate",
  status: z.infer<typeof stateStatusSchema>
) {
  registerContractRoute(app, {
    handler: ({ params }) => service.setStatus(params.id, status),
    method: "POST",
    schemas: { params: idParamsSchema, response: stateSchema },
    url: `${STATE_COLLECTION_PATH}/:id/${action}`
  });
}
