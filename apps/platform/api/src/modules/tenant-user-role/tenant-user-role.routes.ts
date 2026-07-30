import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { TenantUserRoleService } from "./tenant-user-role.service.js";
const path = "/tenant/access/user-roles",
  status = z.enum(["active", "inactive"]),
  record = z.object({
    id: z.number(),
    isProtected: z.boolean(),
    roleId: z.number(),
    roleKey: z.string(),
    roleLabel: z.string(),
    status,
    userEmail: z.string(),
    userId: z.number(),
    userName: z.string(),
    uuid: z.string().length(8)
  }),
  payload = z.object({
    roleId: z.number().int().positive(),
    status,
    userId: z.number().int().positive()
  }),
  params = z.object({ id: z.string().regex(/^\d+$/) }),
  query = z.object({ search: z.string().trim().optional() });
export async function registerTenantUserRoleRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: ({ query, request }) =>
      new TenantUserRoleService(tenantAccessContext(request)).list(
        query.search ? { search: query.search } : {}
      )
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => {
      const r = await new TenantUserRoleService(tenantAccessContext(request)).get(params.id);
      if (!r) throw AppError.notFound("User-role assignment was not found.");
      return r;
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: ({ body, request }) =>
      new TenantUserRoleService(tenantAccessContext(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: ({ body, params, request }) =>
      new TenantUserRoleService(tenantAccessContext(request)).update(params.id, body)
  });
  action(app, "activate", "active");
  action(app, "deactivate", "inactive");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserRoleService(tenantAccessContext(request)).forceDelete(params.id)
  });
}
function action(app: FastifyInstance, name: string, value: z.infer<typeof status>) {
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/${name}`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserRoleService(tenantAccessContext(request)).setStatus(params.id, value)
  });
}
