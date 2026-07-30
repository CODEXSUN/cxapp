import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { BankNamesService } from "./bank-names.service.js";
export const BANK_NAMES_COLLECTION_PATH = "/core/common/contacts/bank-names";
const service = new BankNamesService();
const idParamsSchema = z.object({ id: z.string().regex(/^\d+$/, "BankNames ID must be numeric.") });
const bankNamesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const bankNamesPayloadSchema = z.object({
  name: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const bankNamesQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerBankNamesRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: bankNamesQuerySchema, response: z.array(bankNamesSchema) },
    url: BANK_NAMES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: bankNamesSchema },
    url: `${BANK_NAMES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: bankNamesPayloadSchema, response: bankNamesSchema },
    url: BANK_NAMES_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: bankNamesPayloadSchema, params: idParamsSchema, response: bankNamesSchema },
    url: `${BANK_NAMES_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: bankNamesSchema },
    url: `${BANK_NAMES_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: bankNamesSchema },
    url: `${BANK_NAMES_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: bankNamesSchema },
    url: `${BANK_NAMES_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("BankNames record was not found.");
  return record;
}
