import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { PincodeService } from "./pincode.service.js";

export const PINCODE_COLLECTION_PATH = "/core/common/location/pincodes";
export const PINCODE_RELATIONS_PATH = `${PINCODE_COLLECTION_PATH}/relations`;
const service = new PincodeService();
const paramsSchema = z.object({ id: z.string().regex(/^\d+$/) });
const statusSchema = z.enum(["active", "inactive"]);
const recordSchema = z.object({
  id: z.number().int().positive(),
  cityId: z.number().int().positive(),
  name: z.string(),
  area: z.string(),
  sortOrder: z.number().int(),
  status: statusSchema
});
const relationSchema = recordSchema.extend({
  cityName: z.string(),
  districtId: z.number().int().positive(),
  districtName: z.string(),
  stateId: z.number().int().positive(),
  stateName: z.string(),
  countryId: z.number().int().positive(),
  countryName: z.string()
});
const payloadSchema = recordSchema.omit({ id: true }).extend({
  area: z.string().trim().min(1, "Area is required.").max(200),
  name: z
    .string()
    .trim()
    .min(2, "Postal code must contain at least two characters.")
    .max(20, "Postal code cannot exceed 20 characters.")
    .regex(
      /^[A-Za-z0-9](?:[A-Za-z0-9 -]*[A-Za-z0-9])?$/,
      "Postal code may contain letters, numbers, spaces, and hyphens."
    )
});
const querySchema = z.object({
  cityId: z.string().regex(/^\d+$/).optional(),
  search: z.string().trim().optional()
});

export async function registerPincodeRoutes(app: FastifyInstance) {
  registerList(app, PINCODE_COLLECTION_PATH, false);
  registerList(app, PINCODE_RELATIONS_PATH, true);
  registerGet(app, `${PINCODE_RELATIONS_PATH}/:id`, true);
  registerGet(app, `${PINCODE_COLLECTION_PATH}/:id`, false);
  registerContractRoute(app, {
    method: "POST",
    url: PINCODE_COLLECTION_PATH,
    schemas: { body: payloadSchema, response: recordSchema },
    handler: ({ body }) => service.create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${PINCODE_COLLECTION_PATH}/:id`,
    schemas: { body: payloadSchema, params: paramsSchema, response: recordSchema },
    handler: ({ body, params }) => service.update(params.id, body)
  });
  statusRoute(app, "activate", "active");
  statusRoute(app, "deactivate", "inactive");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${PINCODE_COLLECTION_PATH}/:id/force`,
    schemas: { params: paramsSchema, response: recordSchema },
    handler: ({ params }) => service.forceDelete(params.id)
  });
}

function registerList(app: FastifyInstance, url: string, relations: boolean) {
  if (relations)
    registerContractRoute(app, {
      method: "GET",
      url,
      schemas: { querystring: querySchema, response: z.array(relationSchema) },
      handler: ({ query }) => service.listWithRelations(filters(query))
    });
  else
    registerContractRoute(app, {
      method: "GET",
      url,
      schemas: { querystring: querySchema, response: z.array(recordSchema) },
      handler: ({ query }) => service.list(filters(query))
    });
}
function registerGet(app: FastifyInstance, url: string, relations: boolean) {
  if (relations)
    registerContractRoute(app, {
      method: "GET",
      url,
      schemas: { params: paramsSchema, response: relationSchema },
      handler: async ({ params }) => found(await service.getWithRelations(params.id))
    });
  else
    registerContractRoute(app, {
      method: "GET",
      url,
      schemas: { params: paramsSchema, response: recordSchema },
      handler: async ({ params }) => found(await service.get(params.id))
    });
}
function statusRoute(
  app: FastifyInstance,
  action: "activate" | "deactivate",
  status: z.infer<typeof statusSchema>
) {
  registerContractRoute(app, {
    method: "POST",
    url: `${PINCODE_COLLECTION_PATH}/:id/${action}`,
    schemas: { params: paramsSchema, response: recordSchema },
    handler: ({ params }) => service.setStatus(params.id, status)
  });
}
function filters(query: z.infer<typeof querySchema>) {
  return {
    ...(query.cityId ? { cityId: query.cityId } : {}),
    ...(query.search ? { search: query.search } : {})
  };
}
function found<T>(value: T | null): T {
  if (!value) throw AppError.notFound("Pincode was not found.");
  return value;
}
