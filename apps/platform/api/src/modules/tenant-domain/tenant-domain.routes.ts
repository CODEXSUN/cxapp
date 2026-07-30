import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { TenantDomainService } from "./tenant-domain.service.js";
import type { TenantDomainSavePayload } from "./tenant-domain.types.js";

const tenantDomainService = new TenantDomainService();

function notFound(requestId: string) {
  return {
    error: {
      code: "TENANT_NOT_FOUND",
      message: "Tenant was not found."
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString()
    },
    success: false as const
  };
}

export async function registerTenantDomainRoutes(app: FastifyInstance) {
  app.get("/admin/tenant-domains", async (request) =>
    ok(await tenantDomainService.listAllDomains(), { requestId: request.id })
  );

  app.post("/admin/tenant-domains", async (request, reply) => {
    const domain = await tenantDomainService.createDomain(request.body as TenantDomainSavePayload);
    if (!domain) return reply.code(404).send(notFound(request.id));
    return ok(domain, { requestId: request.id });
  });

  app.put("/admin/tenant-domains/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const domain = await tenantDomainService.updateDomain(
      id,
      request.body as TenantDomainSavePayload
    );
    if (!domain) return reply.code(404).send(notFound(request.id));
    return ok(domain, { requestId: request.id });
  });

  app.get("/admin/tenants/:id/domains", async (request) => {
    const { id } = request.params as { id: string };
    return ok(await tenantDomainService.listDomains(id), { requestId: request.id });
  });

  app.put("/admin/tenants/:id/domains/primary", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { domain?: string } | undefined;
    const tenant = await tenantDomainService.updatePrimaryDomain(id, body?.domain ?? "");
    if (!tenant) return reply.code(404).send(notFound(request.id));
    return ok(tenant, { requestId: request.id });
  });
}
