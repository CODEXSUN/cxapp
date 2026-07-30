import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { TaskManagerJsonStore } from "./task-manager.store.js";
import { TaskManagerLookupStore } from "./task-manager.lookup-store.js";
import type { TodoInput, TodoLookupKind, TodoStatus } from "./task-manager.types.js";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
const store = new TaskManagerJsonStore();
const lookupStore = new TaskManagerLookupStore();
const superAdminScope = "super-admin";
export async function registerTaskManagerRoutes(app: FastifyInstance) {
  app.get("/task-manager/todos", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await store.list(superAdminScope), { requestId: request.id })
  );
  app.get("/task-manager/lookups", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await lookupStore.list(superAdminScope), { requestId: request.id })
  );
  app.post("/task-manager/lookups", { preHandler: requireSuperAdmin }, async (request) => {
    const body = request.body as { kind: TodoLookupKind; name: string };
    return ok(await lookupStore.create(superAdminScope, body.kind, body.name), {
      requestId: request.id
    });
  });
  app.post("/task-manager/todos", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await store.create(superAdminScope, request.body as TodoInput), { requestId: request.id })
  );
  app.post("/task-manager/todos/reorder", { preHandler: requireSuperAdmin }, async (request) =>
    ok(
      await store.reorder(superAdminScope, (request.body as { orderedIds: string[] }).orderedIds),
      { requestId: request.id }
    )
  );
  app.put("/task-manager/todos/:id", { preHandler: requireSuperAdmin }, async (request) =>
    ok(
      await store.update(
        superAdminScope,
        (request.params as { id: string }).id,
        request.body as Partial<TodoInput>
      ),
      { requestId: request.id }
    )
  );
  app.post("/task-manager/todos/:id/status", { preHandler: requireSuperAdmin }, async (request) =>
    ok(
      await store.setStatus(
        superAdminScope,
        (request.params as { id: string }).id,
        (request.body as { status: TodoStatus }).status
      ),
      { requestId: request.id }
    )
  );
  app.delete("/task-manager/todos/:id", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await store.delete(superAdminScope, (request.params as { id: string }).id), {
      requestId: request.id
    })
  );
}
