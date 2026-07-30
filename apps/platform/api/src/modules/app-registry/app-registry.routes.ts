import type { FastifyInstance } from "fastify";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { AppRegistryService } from "./app-registry.service.js";
import {
  numericIdParamsSchema,
  platformAppListSchema,
  platformAppSaveSchema,
  platformAppSchema
} from "./app-registry.schemas.js";

export async function registerAppRegistryRoutes(
  app: FastifyInstance,
  service = new AppRegistryService()
) {
  registerContractRoute(app, {
    method: "GET",
    url: "/admin/apps",
    schemas: { response: platformAppListSchema },
    handler: () => service.listApps()
  });

  registerContractRoute(app, {
    method: "POST",
    url: "/admin/apps",
    schemas: { body: platformAppSaveSchema, response: platformAppSchema },
    handler: async ({ body }) => requireApp(await service.createApp(body))
  });

  registerContractRoute(app, {
    method: "PUT",
    url: "/admin/apps/:id",
    schemas: {
      body: platformAppSaveSchema,
      params: numericIdParamsSchema,
      response: platformAppSchema
    },
    handler: async ({ body, params }) => {
      return requireApp(await service.updateApp(String(params.id), body));
    }
  });
}

function requireApp(appRecord: Awaited<ReturnType<AppRegistryService["createApp"]>>) {
  if (!appRecord)
    throw new AppError({ code: "APP_NOT_FOUND", message: "App was not found.", statusCode: 404 });
  return appRecord;
}
