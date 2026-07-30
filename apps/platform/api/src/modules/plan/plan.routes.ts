import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { PlanService } from "./plan.service.js";
import type { PlanSavePayload } from "./plan.types.js";
const service = new PlanService();
export async function registerPlanRoutes(app: FastifyInstance) {
  app.get("/admin/plans", async (request) =>
    ok(await service.listPlans(), { requestId: request.id })
  );
  app.post("/admin/plans", async (request) =>
    ok(await service.createPlan(request.body as PlanSavePayload), { requestId: request.id })
  );
  app.put("/admin/plans/:id", async (request, reply) => {
    const plan = await service.updatePlan(
      (request.params as { id: string }).id,
      request.body as PlanSavePayload
    );
    if (!plan)
      return reply.code(404).send(notFound("PLAN_NOT_FOUND", "Plan was not found.", request.id));
    return ok(plan, { requestId: request.id });
  });
}

function notFound(code: string, message: string, requestId: string) {
  return {
    error: { code, message },
    meta: { requestId, timestamp: new Date().toISOString() },
    success: false as const
  };
}
