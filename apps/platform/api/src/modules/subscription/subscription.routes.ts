import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { SubscriptionService } from "./subscription.service.js";
import type { SubscriptionSavePayload } from "./subscription.types.js";
const service = new SubscriptionService();
export async function registerSubscriptionRoutes(app: FastifyInstance) {
  app.get("/admin/subscriptions", async (r) =>
    ok(await service.listSubscriptions(), { requestId: r.id })
  );
  app.post("/admin/subscriptions", async (r) =>
    ok(await service.createSubscription(r.body as SubscriptionSavePayload), { requestId: r.id })
  );
  app.put("/admin/subscriptions/:id", async (r, reply) => {
    const subscription = await service.updateSubscription(
      (r.params as { id: string }).id,
      r.body as SubscriptionSavePayload
    );
    if (!subscription)
      return reply
        .code(404)
        .send(notFound("SUBSCRIPTION_NOT_FOUND", "Subscription was not found.", r.id));
    return ok(subscription, { requestId: r.id });
  });
}
function notFound(code: string, message: string, requestId: string) {
  return {
    error: { code, message },
    meta: { requestId, timestamp: new Date().toISOString() },
    success: false as const
  };
}
