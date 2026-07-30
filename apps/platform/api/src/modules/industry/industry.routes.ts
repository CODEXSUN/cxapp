import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fail, ok } from "@codexsun/framework/http";
import { verifyAuthToken } from "../../auth/jwt.js";
import { IndustryService } from "./industry.service.js";
import type { IndustrySavePayload } from "./industry.types.js";
const service = new IndustryService();
export async function registerIndustryRoutes(app: FastifyInstance) {
  app.get("/tenant/industries", { preHandler: requireTenantUser }, async (request) =>
    ok(
      (await service.listIndustries()).filter((industry) => industry.status === "active"),
      { requestId: request.id }
    )
  );
  app.get("/admin/industries", async (r) =>
    ok(await service.listIndustries(), { requestId: r.id })
  );
  app.post("/admin/industries", async (r) =>
    ok(await service.createIndustry(r.body as IndustrySavePayload), { requestId: r.id })
  );
  app.put("/admin/industries/:id", async (r, reply) => {
    const industry = await service.updateIndustry(
      (r.params as { id: string }).id,
      r.body as IndustrySavePayload
    );
    if (!industry)
      return reply.code(404).send(notFound("INDUSTRY_NOT_FOUND", "Industry was not found.", r.id));
    return ok(industry, { requestId: r.id });
  });
}
async function requireTenantUser(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const payload = token ? verifyAuthToken(token) : null;
  if (payload?.userType === "tenant" && payload.tenantId) return;
  return reply
    .code(403)
    .send(
      fail(
        { code: "TENANT_INDUSTRY_REQUIRED", message: "Industry lookup requires a tenant session." },
        { requestId: request.id }
      )
    );
}
function notFound(code: string, message: string, requestId: string) {
  return {
    error: { code, message },
    meta: { requestId, timestamp: new Date().toISOString() },
    success: false as const
  };
}
