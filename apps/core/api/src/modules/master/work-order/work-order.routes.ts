import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { WorkOrderService } from "./work-order.service.js";

export const WORK_ORDER_COLLECTION_PATH = "/core/master/work-orders";
const service = new WorkOrderService();
const idSchema = z.object({ id: z.string().regex(/^\d+$/, "Work order ID must be numeric.") });
const statusSchema = z.enum(["active", "inactive", "suspend", "deleted"]);
const workOrderSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string().length(8),
  code: z.string(),
  name: z.string(),
  status: statusSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable()
});
const payloadSchema = z.object({
  code: z.string().trim().min(1, "Work order code is required."),
  name: z.string().trim().min(1, "Work order name is required."),
  status: statusSchema.default("active"),
  isActive: z.boolean().default(true)
});
const querySchema = z.object({ search: z.string().trim().optional() });

export async function registerWorkOrderRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: querySchema, response: z.array(workOrderSchema) },
    url: WORK_ORDER_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.find(params.id)),
    method: "GET",
    schemas: { params: idSchema, response: workOrderSchema },
    url: `${WORK_ORDER_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body }) => service.create(body),
    method: "POST",
    schemas: { body: payloadSchema, response: workOrderSchema },
    url: WORK_ORDER_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: { body: payloadSchema, params: idSchema, response: workOrderSchema },
    url: `${WORK_ORDER_COLLECTION_PATH}/:id`
  });
  lifecycle(app, "activate", true);
  lifecycle(app, "deactivate", false);
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idSchema, response: workOrderSchema },
    url: `${WORK_ORDER_COLLECTION_PATH}/:id/force`
  });
}
function lifecycle(app: FastifyInstance, action: "activate" | "deactivate", active: boolean) {
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, active)),
    method: "POST",
    schemas: { params: idSchema, response: workOrderSchema },
    url: `${WORK_ORDER_COLLECTION_PATH}/:id/${action}`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("Work order was not found or is protected.");
  return record;
}
