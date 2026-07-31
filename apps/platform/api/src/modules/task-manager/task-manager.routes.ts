import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { z } from "zod";
import { AppError } from "@cxapp/framework/errors";
import { ok } from "@cxapp/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type { TaskManagerDatabase } from "./task-manager.migration.js";
import { TaskManagerRepository } from "./task-manager.repository.js";
import { TaskManagerService } from "./task-manager.service.js";
import type { TodoInput } from "./task-manager.types.js";

const superAdminScope = "super-admin";
const lookupKindSchema = z.enum(["category", "group", "status", "priority"]);
const todoFieldsSchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(65_535).optional(),
  dueDate: z.string().max(32).optional(),
  groupName: z.string().trim().max(120).optional(),
  priority: z.string().trim().min(1).max(40).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().min(1).max(255).optional()
});
const createTodoSchema = todoFieldsSchema.extend({
  title: z.string().trim().min(1).max(255)
});
const todoIdSchema = z.object({ id: z.string().regex(/^[a-f0-9]{8}$/) });

type TaskManagerRequestContext = {
  actorEmail: string;
  database: Kysely<TaskManagerDatabase>;
  scopeKey: string;
};

export async function registerTaskManagerRoutes(app: FastifyInstance) {
  app.get("/task-manager/todos", async (request) => {
    const context = await taskManagerRequestContext(request);
    return ok(await serviceFor(context).list(context.scopeKey), { requestId: request.id });
  });
  app.get("/task-manager/lookups", async (request) => {
    const context = await taskManagerRequestContext(request);
    return ok(await serviceFor(context).listLookups(context.scopeKey), {
      requestId: request.id
    });
  });
  app.post("/task-manager/lookups", async (request) => {
    const context = await taskManagerRequestContext(request);
    const body = z
      .object({ kind: lookupKindSchema, name: z.string().trim().min(1).max(120) })
      .parse(request.body);
    return ok(
      await serviceFor(context).createLookup(
        context.scopeKey,
        body.kind,
        body.name,
        context.actorEmail
      ),
      { requestId: request.id }
    );
  });
  app.post("/task-manager/todos", async (request) => {
    const context = await taskManagerRequestContext(request);
    return ok(
      await serviceFor(context).create(
        context.scopeKey,
        createTodoSchema.parse(request.body) as TodoInput,
        context.actorEmail
      ),
      { requestId: request.id }
    );
  });
  app.post("/task-manager/todos/reorder", async (request) => {
    const context = await taskManagerRequestContext(request);
    const body = z
      .object({ orderedIds: z.array(z.string().regex(/^[a-f0-9]{8}$/)).max(10_000) })
      .parse(request.body);
    return ok(await serviceFor(context).reorder(context.scopeKey, body.orderedIds), {
      requestId: request.id
    });
  });
  app.put("/task-manager/todos/:id", async (request) => {
    const context = await taskManagerRequestContext(request);
    return ok(
      await serviceFor(context).update(
        context.scopeKey,
        todoIdSchema.parse(request.params).id,
        todoFieldsSchema.parse(request.body) as Partial<TodoInput>
      ),
      { requestId: request.id }
    );
  });
  app.post("/task-manager/todos/:id/status", async (request) => {
    const context = await taskManagerRequestContext(request);
    return ok(
      await serviceFor(context).status(
        context.scopeKey,
        todoIdSchema.parse(request.params).id,
        z.object({ status: z.string().trim().min(1).max(40) }).parse(request.body).status
      ),
      { requestId: request.id }
    );
  });
  app.delete("/task-manager/todos/:id", async (request) => {
    const context = await taskManagerRequestContext(request);
    return ok(
      await serviceFor(context).delete(context.scopeKey, todoIdSchema.parse(request.params).id),
      { requestId: request.id }
    );
  });
}

function serviceFor(context: TaskManagerRequestContext) {
  return new TaskManagerService(new TaskManagerRepository(context.database));
}

async function taskManagerRequestContext(
  request: FastifyRequest
): Promise<TaskManagerRequestContext> {
  const payload = request.authContext?.payload;
  if (!payload) throw AppError.unauthorized("Sign in to access Task Manager.");

  if (payload.userType === "super_admin") {
    return {
      actorEmail: payload.email,
      database: getPlatformDatabase() as unknown as Kysely<TaskManagerDatabase>,
      scopeKey: superAdminScope
    };
  }

  if (payload.userType !== "tenant") {
    throw AppError.forbidden("Task Manager is available to tenants and Super Admin.");
  }

  const context = tenantAccessContext(request);
  const enabled = await context.database
    .selectFrom("app_module_settings")
    .select("id")
    .where("module_key", "=", "platform.task-manager")
    .where("enabled", "=", true)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!enabled) throw AppError.forbidden("Task Manager is not enabled for this tenant.");
  await context.authorize("platform.task-manager.access");

  return {
    actorEmail: context.actorEmail,
    database: context.database as unknown as Kysely<TaskManagerDatabase>,
    scopeKey: `tenant:${context.tenantId}`
  };
}
