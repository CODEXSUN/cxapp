import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { ContactGroupsService } from "./contact-groups.service.js";
export const CONTACT_GROUPS_COLLECTION_PATH = "/core/common/contacts/contact-groups";
const service = new ContactGroupsService();
const idParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ContactGroups ID must be numeric.")
});
const contactGroupsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int()
});
const contactGroupsPayloadSchema = z.object({
  name: z.string().trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(1000)
});
const contactGroupsQuerySchema = z.object({ search: z.string().trim().optional() });
export async function registerContactGroupsRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query }) => service.list(query.search ? { search: query.search } : {}),
    method: "GET",
    schemas: { querystring: contactGroupsQuerySchema, response: z.array(contactGroupsSchema) },
    url: CONTACT_GROUPS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.get(params.id)),
    method: "GET",
    schemas: { params: idParamsSchema, response: contactGroupsSchema },
    url: `${CONTACT_GROUPS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ body }) => required(await service.create(body)),
    method: "POST",
    schemas: { body: contactGroupsPayloadSchema, response: contactGroupsSchema },
    url: CONTACT_GROUPS_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ body, params }) => required(await service.update(params.id, body)),
    method: "PUT",
    schemas: {
      body: contactGroupsPayloadSchema,
      params: idParamsSchema,
      response: contactGroupsSchema
    },
    url: `${CONTACT_GROUPS_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, true)),
    method: "POST",
    schemas: { params: idParamsSchema, response: contactGroupsSchema },
    url: `${CONTACT_GROUPS_COLLECTION_PATH}/:id/activate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.setActive(params.id, false)),
    method: "POST",
    schemas: { params: idParamsSchema, response: contactGroupsSchema },
    url: `${CONTACT_GROUPS_COLLECTION_PATH}/:id/deactivate`
  });
  registerContractRoute(app, {
    handler: async ({ params }) => required(await service.forceDelete(params.id)),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: contactGroupsSchema },
    url: `${CONTACT_GROUPS_COLLECTION_PATH}/:id/force`
  });
}
function required<T>(record: T | null): T {
  if (!record) throw AppError.notFound("ContactGroups record was not found.");
  return record;
}
