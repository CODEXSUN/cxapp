import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { PlatformActivityService } from "./platform-activity.service.js";

const service = new PlatformActivityService();

export async function registerPlatformActivityRoutes(app: FastifyInstance) {
  app.get("/admin/platform-activity", async (request) =>
    ok(await service.listActivity(), { requestId: request.id })
  );
}
