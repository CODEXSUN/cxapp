import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { AccessControlService } from "./access-control.service.js";
import type {
  AccessPermissionSavePayload,
  AccessRoleSavePayload,
  AccessUserSavePayload
} from "./access-control.types.js";

const service = new AccessControlService();
export async function registerAccessControlRoutes(app: FastifyInstance) {
  app.get("/admin/access-control", async (request) =>
    ok(await service.overview(), { requestId: request.id })
  );
  app.post("/admin/access-control/permissions", async (request) =>
    ok(await service.savePermission(request.body as AccessPermissionSavePayload), {
      requestId: request.id
    })
  );
  app.post("/admin/access-control/roles", async (request) =>
    ok(await service.saveRole(request.body as AccessRoleSavePayload), { requestId: request.id })
  );
  app.post("/admin/access-control/users", async (request) =>
    ok(await service.saveUser(request.body as AccessUserSavePayload), { requestId: request.id })
  );
}
