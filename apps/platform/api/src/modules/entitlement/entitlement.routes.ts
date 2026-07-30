import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { EntitlementService } from "./entitlement.service.js";
import type { EntitlementSavePayload, PlanAccessSavePayload } from "./entitlement.types.js";

const service = new EntitlementService();

export async function registerEntitlementRoutes(app: FastifyInstance) {
  app.get("/admin/entitlements", async (request) =>
    ok(await service.listEntitlements(), { requestId: request.id })
  );
  app.get("/admin/tenant-access", async (request) =>
    ok(await service.listTenantAccess(), { requestId: request.id })
  );
  app.get("/admin/plans/:id/access", async (request, reply) => {
    const access = await service.getPlanAccess((request.params as { id: string }).id);
    if (!access)
      return reply.code(404).send(notFound("PLAN_NOT_FOUND", "Plan was not found.", request.id));
    return ok(access, { requestId: request.id });
  });
  app.put("/admin/plans/:id/access", async (request, reply) => {
    const access = await service.savePlanAccess(
      (request.params as { id: string }).id,
      request.body as PlanAccessSavePayload
    );
    if (!access)
      return reply.code(404).send(notFound("PLAN_NOT_FOUND", "Plan was not found.", request.id));
    return ok(access, { requestId: request.id });
  });
  app.post("/admin/entitlements", async (request) =>
    ok(await service.createEntitlement(request.body as EntitlementSavePayload), {
      requestId: request.id
    })
  );
  app.put("/admin/entitlements/:id", async (request, reply) => {
    const entitlement = await service.updateEntitlement(
      (request.params as { id: string }).id,
      request.body as EntitlementSavePayload
    );
    if (!entitlement)
      return reply
        .code(404)
        .send(notFound("ENTITLEMENT_NOT_FOUND", "Entitlement was not found.", request.id));
    return ok(entitlement, { requestId: request.id });
  });
}

function notFound(code: string, message: string, requestId: string) {
  return {
    error: { code, message },
    meta: { requestId, timestamp: new Date().toISOString() },
    success: false as const
  };
}
