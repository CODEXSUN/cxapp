import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { DistrictService } from "./district.service.js";
export const DISTRICT_COLLECTION_PATH = "/core/common/location/districts";
const service = new DistrictService();
const paramsSchema = z.object({ id: z.string().regex(/^\d+$/) });
const statusSchema = z.enum(["active", "inactive"]);
const recordSchema = z.object({
  id: z.number().int().positive(),
  stateId: z.number().int().positive(),
  stateName: z.string(),
  countryId: z.number().int().positive(),
  countryName: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  status: statusSchema
});
const payloadSchema = recordSchema.pick({
  stateId: true,
  name: true,
  sortOrder: true,
  status: true
});
const querySchema = z.object({
  stateId: z.string().regex(/^\d+$/).optional(),
  search: z.string().trim().optional()
});
export async function registerDistrictRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: DISTRICT_COLLECTION_PATH,
    schemas: { querystring: querySchema, response: z.array(recordSchema) },
    handler: ({ query }) =>
      service.list({
        ...(query.stateId ? { stateId: query.stateId } : {}),
        ...(query.search ? { search: query.search } : {})
      })
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${DISTRICT_COLLECTION_PATH}/:id`,
    schemas: { params: paramsSchema, response: recordSchema },
    handler: async ({ params }) => {
      const value = await service.get(params.id);
      if (!value) throw AppError.notFound("District was not found.");
      return value;
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: DISTRICT_COLLECTION_PATH,
    schemas: { body: payloadSchema, response: recordSchema },
    handler: ({ body }) => service.create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${DISTRICT_COLLECTION_PATH}/:id`,
    schemas: { body: payloadSchema, params: paramsSchema, response: recordSchema },
    handler: ({ body, params }) => service.update(params.id, body)
  });
  statusRoute(app, "activate", "active");
  statusRoute(app, "deactivate", "inactive");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${DISTRICT_COLLECTION_PATH}/:id/force`,
    schemas: { params: paramsSchema, response: recordSchema },
    handler: ({ params }) => service.forceDelete(params.id)
  });
}
function statusRoute(
  app: FastifyInstance,
  action: "activate" | "deactivate",
  status: z.infer<typeof statusSchema>
) {
  registerContractRoute(app, {
    method: "POST",
    url: `${DISTRICT_COLLECTION_PATH}/:id/${action}`,
    schemas: { params: paramsSchema, response: recordSchema },
    handler: ({ params }) => service.setStatus(params.id, status)
  });
}
