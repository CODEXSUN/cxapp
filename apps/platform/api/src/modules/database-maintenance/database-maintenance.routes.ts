import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { ok } from "@codexsun/framework/http";
import { registerContractRoute } from "@codexsun/framework/http";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import { DatabaseMaintenanceService } from "./database-maintenance.service.js";
import type { DatabaseActionPayload } from "./database-maintenance.types.js";

const service = new DatabaseMaintenanceService();
const tenantIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const databaseActionSchema = z.object({
  note: z.string().trim().max(240).optional(),
  tenantId: z.number().int().positive().optional()
});
const databaseRunSchema = z.object({
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  databaseName: z.string(),
  details: z.record(z.string(), z.unknown()),
  id: z.number(),
  operation: z.enum(["backup", "migrate", "refresh", "reinstall", "restore", "setup", "status"]),
  scope: z.enum(["master", "tenant"]),
  status: z.enum(["completed", "failed", "requested", "running"]),
  targetKey: z.string(),
  uuid: z.string()
});

export async function registerDatabaseMaintenanceRoutes(app: FastifyInstance) {
  registerTenantInstallRoute(app, "setup");
  registerTenantInstallRoute(app, "reinstall");
  app.get("/admin/database/master", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.masterStatus(), { requestId: request.id })
  );
  app.get("/admin/database/tenants", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.tenantStatuses(), { requestId: request.id })
  );
  app.get(
    "/admin/database/tenants/:id/details",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const details = await service.tenantDetails(Number((request.params as { id: string }).id));
      if (!details)
        return reply
          .code(404)
          .send(notFound("TENANT_NOT_FOUND", "Tenant was not found.", request.id));
      return ok(details, { requestId: request.id });
    }
  );
  app.post("/admin/database/master/migrate", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.migrateMaster(request.body as DatabaseActionPayload), {
      requestId: request.id
    })
  );
  app.post("/admin/database/master/backup", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.requestMasterBackup(request.body as DatabaseActionPayload), {
      requestId: request.id
    })
  );
  app.post("/admin/database/master/restore", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.requestMasterRestore(request.body as DatabaseActionPayload), {
      requestId: request.id
    })
  );
  app.post(
    "/admin/database/tenants/:id/migrate",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const run = await service.migrateTenant(
        Number((request.params as { id: string }).id),
        request.body as DatabaseActionPayload
      );
      if (!run)
        return reply
          .code(404)
          .send(notFound("TENANT_NOT_FOUND", "Tenant was not found.", request.id));
      return ok(run, { requestId: request.id });
    }
  );
  app.post(
    "/admin/database/tenants/:id/backup",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const run = await service.requestTenantBackup(
        Number((request.params as { id: string }).id),
        request.body as DatabaseActionPayload
      );
      if (!run)
        return reply
          .code(404)
          .send(notFound("TENANT_NOT_FOUND", "Tenant was not found.", request.id));
      return ok(run, { requestId: request.id });
    }
  );
  app.post(
    "/admin/database/tenants/:id/restore",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const run = await service.requestTenantRestore(
        Number((request.params as { id: string }).id),
        request.body as DatabaseActionPayload
      );
      if (!run)
        return reply
          .code(404)
          .send(notFound("TENANT_NOT_FOUND", "Tenant was not found.", request.id));
      return ok(run, { requestId: request.id });
    }
  );
}

function registerTenantInstallRoute(app: FastifyInstance, operation: "reinstall" | "setup") {
  registerContractRoute(app, {
    method: "POST",
    url: `/admin/database/tenants/:id/${operation}`,
    preHandler: requireSuperAdmin,
    schemas: {
      body: databaseActionSchema,
      params: tenantIdParamsSchema,
      response: databaseRunSchema
    },
    handler: async ({ body, params }) => {
      const run =
        operation === "setup"
          ? await service.setupTenant(params.id, body)
          : await service.reinstallTenant(params.id, body);
      if (!run) throw AppError.notFound("Tenant was not found.");
      return run;
    }
  });
}

function notFound(code: string, message: string, requestId: string) {
  return {
    error: { code, message },
    meta: { requestId, timestamp: new Date().toISOString() },
    success: false as const
  };
}
