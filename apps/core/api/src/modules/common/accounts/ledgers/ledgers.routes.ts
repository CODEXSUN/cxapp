import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { LedgersService } from "./ledgers.service.js";
export const LEDGERS_PATH = "/core/common/accounts/ledgers";
const service = new LedgersService();
const idSchema = z.object({ id: z.string().regex(/^\d+$/, "Ledger ID must be numeric.") });
const statusSchema = z.enum(["active", "inactive"]);
const recordSchema = z.object({
  id: z.number().int().positive(),
  ledgerGroupId: z.number().int().positive(),
  ledgerGroupName: z.string(),
  name: z.string(),
  status: statusSchema
});
const payloadSchema = z.object({
  ledgerGroupId: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  status: statusSchema
});
const querySchema = z.object({ search: z.string().trim().optional() });
export async function registerLedgersRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: LEDGERS_PATH,
    schemas: { querystring: querySchema, response: z.array(recordSchema) },
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {})
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${LEDGERS_PATH}/:id`,
    schemas: { params: idSchema, response: recordSchema },
    handler: async ({ params }) => required(await service.get(params.id))
  });
  registerContractRoute(app, {
    method: "POST",
    url: LEDGERS_PATH,
    schemas: { body: payloadSchema, response: recordSchema },
    handler: ({ body }) => service.create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${LEDGERS_PATH}/:id`,
    schemas: { body: payloadSchema, params: idSchema, response: recordSchema },
    handler: ({ body, params }) => service.update(params.id, body)
  });
  lifecycle(app, "activate", "active");
  lifecycle(app, "deactivate", "inactive");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${LEDGERS_PATH}/:id/force`,
    schemas: { params: idSchema, response: recordSchema },
    handler: ({ params }) => service.forceDelete(params.id)
  });
}
function lifecycle(
  app: FastifyInstance,
  action: "activate" | "deactivate",
  status: "active" | "inactive"
) {
  registerContractRoute(app, {
    method: "POST",
    url: `${LEDGERS_PATH}/:id/${action}`,
    schemas: { params: idSchema, response: recordSchema },
    handler: ({ params }) => service.setStatus(params.id, status)
  });
}
function required<T>(value: T | null) {
  if (!value) throw AppError.notFound("Ledger was not found.");
  return value;
}
