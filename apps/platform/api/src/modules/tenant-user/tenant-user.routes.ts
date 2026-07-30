import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { TenantUserService } from "./tenant-user.service.js";

const path = "/tenant/access/users";
const status = z.enum(["active", "inactive", "suspended"]);
const record = z.object({
  email: z.string(),
  id: z.number().int().positive(),
  isProtected: z.boolean(),
  name: z.string(),
  status,
  uuid: z.string().length(8)
});
const payload = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(180),
  password: z.string().min(8).max(128).optional(),
  status
});
const params = z.object({ id: z.string().regex(/^\d+$/) });
const query = z.object({ search: z.string().trim().optional() });
export async function registerTenantUserRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: ({ query, request }) =>
      new TenantUserService(tenantAccessContext(request)).list(
        query.search ? { search: query.search } : {}
      )
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => {
      const value = await new TenantUserService(tenantAccessContext(request)).get(params.id);
      if (!value) throw AppError.notFound("User was not found.");
      return value;
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: ({ body, request }) => new TenantUserService(tenantAccessContext(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: ({ body, params, request }) =>
      new TenantUserService(tenantAccessContext(request)).update(params.id, body)
  });
  action(app, "activate", "active");
  action(app, "deactivate", "inactive");
  action(app, "suspend", "suspended");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserService(tenantAccessContext(request)).forceDelete(params.id)
  });
}
function action(app: FastifyInstance, name: string, value: z.infer<typeof status>) {
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/${name}`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserService(tenantAccessContext(request)).setStatus(params.id, value)
  });
}
