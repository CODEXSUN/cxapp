import type { FastifyInstance, FastifyRequest } from "fastify";
import { ok } from "@cxapp/framework/http";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { PlatformRegistryService } from "./platform-registry.service.js";

const service = new PlatformRegistryService();
const idParamsSchema = z.object({ id: z.string().min(1) }).strict();
const documentationRowSchema = z
  .object({
    createdAt: z.string(),
    id: z.string(),
    key: z.string(),
    updatedAt: z.string(),
    value: z.string()
  })
  .strict();
const planningNoteSchema = z
  .object({
    body: z.string(),
    createdAt: z.string(),
    id: z.string(),
    title: z.string(),
    updatedAt: z.string()
  })
  .strict();
const registrySaveSchema = z
  .object({
    active: z.boolean().optional(),
    description: z.string().optional(),
    documentation: z.record(z.string(), z.array(documentationRowSchema)).optional(),
    groupId: z.string().optional(),
    key: z.string().min(1),
    moduleType: z.enum(["area", "module", "page"]).optional(),
    name: z.string().min(1),
    parentGroupId: z.string().optional(),
    parentModuleId: z.string().optional(),
    planningNotes: z.array(planningNoteSchema).optional(),
    platformId: z.string().optional(),
    routePath: z.string().optional(),
    sortOrder: z.number().optional(),
    status: z.string().optional()
  })
  .strict();

export async function registerPlatformRegistryRoutes(app: FastifyInstance) {
  app.get("/admin/platform-registry/result", async (request) =>
    ok(await service.registryResult(), { requestId: request.id })
  );

  app.get("/admin/platform-registry/platforms", async (request) =>
    ok(await service.listRegistryPlatforms(), { requestId: request.id })
  );
  app.post("/admin/platform-registry/platforms", async (request) =>
    ok(
      await service.createRegistryPlatform(registrySaveSchema.parse(request.body), actor(request)),
      {
        requestId: request.id
      }
    )
  );
  app.put("/admin/platform-registry/platforms/:id", async (request) =>
    ok(
      await service.updateRegistryPlatform(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/platform-registry/platforms/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "platforms",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/platform-registry/platforms/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "platforms",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/platform-registry/groups", async (request) =>
    ok(await service.listRegistryGroups(), { requestId: request.id })
  );
  app.post("/admin/platform-registry/groups", async (request) =>
    ok(await service.createRegistryGroup(registrySaveSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.put("/admin/platform-registry/groups/:id", async (request) =>
    ok(
      await service.updateRegistryGroup(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/platform-registry/groups/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "groups",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/platform-registry/groups/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "groups",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/platform-registry/modules", async (request) =>
    ok(await service.listRegistryModules(), { requestId: request.id })
  );
  app.post("/admin/platform-registry/modules", async (request) =>
    ok(await service.createRegistryModule(registrySaveSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.put("/admin/platform-registry/modules/:id", async (request) =>
    ok(
      await service.updateRegistryModule(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/platform-registry/modules/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "modules",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/platform-registry/modules/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "modules",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
}

function actor(request: FastifyRequest) {
  return requireDevkitActor().email?.trim() || requireDevkitActor().id || request.id;
}
