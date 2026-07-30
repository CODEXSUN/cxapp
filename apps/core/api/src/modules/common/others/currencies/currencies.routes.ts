import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { CurrenciesService } from "./currencies.service.js";
export const CURRENCIES_COLLECTION_PATH = "/core/common/others/currencies";
const service = new CurrenciesService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "Currencies ID must be numeric.")
});
const currenciesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  symbol: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const currenciesPayloadSchema = z.object({
  name: z.string().trim(),
  symbol: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const currenciesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerCurrenciesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: currenciesQuerySchema, response: z.array(currenciesSchema) },
    url: CURRENCIES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: currenciesSchema },
    url: `${CURRENCIES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: currenciesPayloadSchema, response: currenciesSchema },
    url: CURRENCIES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: currenciesPayloadSchema, params: idParamsSchema, response: currenciesSchema },
    url: `${CURRENCIES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: currenciesSchema },
    url: `${CURRENCIES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: currenciesSchema },
    url: `${CURRENCIES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: currenciesSchema },
    url: `${CURRENCIES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Currencies record was not found.");
  return record;
}
