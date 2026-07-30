import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import { AppOrchestrationService } from "./app-orchestration.service.js";
const service = new AppOrchestrationService();
export async function registerAppOrchestrationRoutes(app: FastifyInstance) {
  app.get("/admin/app-operations", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.list(), { requestId: request.id })
  );
  app.get(
    "/admin/app-operations/:id",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const item = await service.get((request.params as { id: string }).id);
      return item
        ? ok(item, { requestId: request.id })
        : reply.code(404).send({
            success: false,
            error: { code: "APP_NOT_FOUND", message: "Repository app was not found." }
          });
    }
  );
}
