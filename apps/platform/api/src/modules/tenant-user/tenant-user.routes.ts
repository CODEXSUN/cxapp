import type { FastifyInstance } from "fastify";
import { createConnection } from "mysql2/promise";
import { z } from "zod";
import { AppError, isAppError } from "@cxapp/framework/errors";
import { registerContractRoute } from "@cxapp/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import {
  getTenantDatabase,
  resolveTenantDatabasePassword
} from "../../database/tenant-database.js";
import { TenantService } from "../tenant/index.js";
import type { Tenant } from "../tenant/index.js";
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
const adminTenantParams = z.object({ tenantId: z.coerce.number().int().positive() });
const adminRecordParams = adminTenantParams.extend({ id: z.string().regex(/^\d+$/) });
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
  registerSuperAdminTenantUserRoutes(app);
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

function registerSuperAdminTenantUserRoutes(app: FastifyInstance) {
  const adminPath = "/admin/tenants/:tenantId/users";
  registerContractRoute(app, {
    method: "GET",
    url: adminPath,
    preHandler: requireSuperAdmin,
    schemas: { params: adminTenantParams, querystring: query, response: z.array(record) },
    handler: async ({ params, query, request }) =>
      new TenantUserService(await superAdminContext(request, params.tenantId)).list(
        query.search ? { search: query.search } : {}
      )
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${adminPath}/:id`,
    preHandler: requireSuperAdmin,
    schemas: { params: adminRecordParams, response: record },
    handler: async ({ params, request }) => {
      const value = await new TenantUserService(
        await superAdminContext(request, params.tenantId)
      ).get(params.id);
      if (!value) throw AppError.notFound("User was not found.");
      return value;
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: adminPath,
    preHandler: requireSuperAdmin,
    schemas: { body: payload, params: adminTenantParams, response: record },
    handler: async ({ body, params, request }) =>
      new TenantUserService(await superAdminContext(request, params.tenantId)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${adminPath}/:id`,
    preHandler: requireSuperAdmin,
    schemas: { body: payload, params: adminRecordParams, response: record },
    handler: async ({ body, params, request }) =>
      new TenantUserService(await superAdminContext(request, params.tenantId)).update(
        params.id,
        body
      )
  });
  adminAction(app, "activate", "active");
  adminAction(app, "deactivate", "inactive");
  adminAction(app, "suspend", "suspended");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${adminPath}/:id/force`,
    preHandler: requireSuperAdmin,
    schemas: { params: adminRecordParams, response: record },
    handler: async ({ params, request }) =>
      new TenantUserService(await superAdminContext(request, params.tenantId)).forceDelete(
        params.id
      )
  });
}

function adminAction(app: FastifyInstance, name: string, value: z.infer<typeof status>) {
  registerContractRoute(app, {
    method: "POST",
    url: `/admin/tenants/:tenantId/users/:id/${name}`,
    preHandler: requireSuperAdmin,
    schemas: { params: adminRecordParams, response: record },
    handler: async ({ params, request }) =>
      new TenantUserService(await superAdminContext(request, params.tenantId)).setStatus(
        params.id,
        value
      )
  });
}

async function superAdminContext(
  request: Parameters<typeof requireSuperAdmin>[0],
  tenantId: number
) {
  const tenant = await new TenantService().getTenant(String(tenantId));
  if (!tenant) throw AppError.notFound("Tenant was not found.");
  await requireTenantUserDatabase(tenant);
  return {
    actorEmail: request.authContext?.payload.email ?? "super-admin@codexsun.app",
    authorize: async (_permission: string) => undefined,
    database: getTenantDatabase(tenant),
    tenantId: tenant.uuid
  };
}

async function requireTenantUserDatabase(tenant: Tenant) {
  let connection: Awaited<ReturnType<typeof createConnection>> | undefined;
  try {
    connection = await createConnection({
      database: tenant.dbName,
      host: tenant.dbHost,
      password: resolveTenantDatabasePassword(tenant),
      port: tenant.dbPort,
      timezone: "Z",
      user: tenant.dbUser
    });
    const [tables] = await connection.query("SHOW TABLES LIKE 'app_users'");
    if (!Array.isArray(tables) || tables.length === 0) {
      throw setupRequiredError(tenant, "The required user table is missing.");
    }
  } catch (error) {
    if (isAppError(error)) throw error;
    const code = databaseErrorCode(error);
    if (code === "ER_BAD_DB_ERROR" || code === "ER_NO_SUCH_TABLE") {
      throw setupRequiredError(tenant, "The tenant database has not been installed.");
    }
    const message = error instanceof Error ? error.message : String(error);
    throw AppError.conflict(`Could not connect to tenant database "${tenant.dbName}": ${message}`, {
      databaseName: tenant.dbName,
      setupRequired: false,
      tenantId: tenant.id
    });
  } finally {
    await connection?.end();
  }
}

function setupRequiredError(tenant: Tenant, reason: string) {
  return AppError.conflict(
    `${reason} Open the Database page for ${tenant.tenantName} and run New setup manually.`,
    { databaseName: tenant.dbName, setupRequired: true, tenantId: tenant.id }
  );
}

function databaseErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
