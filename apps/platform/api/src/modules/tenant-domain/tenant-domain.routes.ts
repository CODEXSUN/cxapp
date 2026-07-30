import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { z } from "zod";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import { TenantDomainService } from "./tenant-domain.service.js";

const service = new TenantDomainService();
const paramsSchema = z.object({ id: z.string().min(1).max(120) }).strict();
const payloadSchema = z
  .object({
    domain: z.string().min(1).max(191),
    isPrimary: z.boolean().optional(),
    status: z.enum(["active", "disabled"]).optional(),
    tenantId: z.number().int().positive()
  })
  .strict();

export async function registerTenantDomainRoutes(app: FastifyInstance) {
  app.get("/admin/tenant-domains", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.listAllDomains(), { requestId: request.id })
  );
  app.post("/admin/tenant-domains", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.createDomain(domainPayload(request.body)), { requestId: request.id })
  );
  app.put("/admin/tenant-domains/:id", { preHandler: requireSuperAdmin }, async (request) => {
    const { id } = paramsSchema.parse(request.params);
    return ok(await service.updateDomain(id, domainPayload(request.body)), {
      requestId: request.id
    });
  });
  app.post(
    "/admin/tenant-domains/:id/verify",
    { preHandler: requireSuperAdmin },
    async (request) => {
      const { id } = paramsSchema.parse(request.params);
      return ok(await service.verifyDomain(id), { requestId: request.id });
    }
  );
  app.get("/admin/tenants/:id/domains", { preHandler: requireSuperAdmin }, async (request) => {
    const { id } = paramsSchema.parse(request.params);
    return ok(await service.listDomains(id), { requestId: request.id });
  });
  app.put(
    "/admin/tenants/:id/domains/primary",
    { preHandler: requireSuperAdmin },
    async (request) => {
      const { id } = paramsSchema.parse(request.params);
      const body = z
        .object({ domain: z.string().min(1).max(191) })
        .strict()
        .parse(request.body);
      return ok(await service.updatePrimaryDomain(id, body.domain), { requestId: request.id });
    }
  );
}

function domainPayload(value: unknown) {
  const parsed = payloadSchema.parse(value);
  return {
    domain: parsed.domain,
    tenantId: parsed.tenantId,
    ...(parsed.isPrimary === undefined ? {} : { isPrimary: parsed.isPrimary }),
    ...(parsed.status === undefined ? {} : { status: parsed.status })
  };
}
