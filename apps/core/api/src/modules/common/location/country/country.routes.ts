import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { CountryService } from "./country.service.js";

export const COUNTRY_COLLECTION_PATH = "/core/common/location/countries";

const service = new CountryService();
const idParamsSchema = z.object({ id: z.string().regex(/^\d+$/, "Country ID must be numeric.") });
const countryStatusSchema = z.enum(["active", "inactive"]);
const countrySchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  status: countryStatusSchema
});
const countryPayloadSchema = countrySchema.omit({ id: true });
const countryQuerySchema = z.object({ search: z.string().trim().optional() });

export async function registerCountryRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: countryQuerySchema, response: z.array(countrySchema) },
    url: COUNTRY_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => {
      const record = await service.get(params.id);
      if (!record) throw AppError.notFound("Country was not found.");
      return record;
    },
    method: "GET",
    schemas: { params: idParamsSchema, response: countrySchema },
    url: `${COUNTRY_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body }) => service.create(body),
    method: "POST",
    schemas: { body: countryPayloadSchema, response: countrySchema },
    url: COUNTRY_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: ({ body, params }) => service.update(params.id, body),
    method: "PUT",
    schemas: { body: countryPayloadSchema, params: idParamsSchema, response: countrySchema },
    url: `${COUNTRY_COLLECTION_PATH}/:id`
  });
  registerStatusRoute(app, "activate", "active");
  registerStatusRoute(app, "deactivate", "inactive");
  registerContractRoute(app, {
    handler: ({ params }) => service.forceDelete(params.id),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: countrySchema },
    url: `${COUNTRY_COLLECTION_PATH}/:id/force`
  });
}

function registerStatusRoute(
  app: FastifyInstance,
  action: "activate" | "deactivate",
  status: z.infer<typeof countryStatusSchema>
) {
  registerContractRoute(app, {
    handler: ({ params }) => service.setStatus(params.id, status),
    method: "POST",
    schemas: { params: idParamsSchema, response: countrySchema },
    url: `${COUNTRY_COLLECTION_PATH}/:id/${action}`
  });
}
