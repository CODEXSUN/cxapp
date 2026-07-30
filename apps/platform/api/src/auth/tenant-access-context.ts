import type { FastifyRequest } from "fastify";
import { requireTenantAccess } from "@cxapp/framework/api";
import { AppError } from "@cxapp/framework/errors";
import { getTenantDatabaseByName } from "../database/tenant-database.js";
import { env } from "../env.js";

export function tenantAccessContext(request: FastifyRequest) {
  const header = request.headers["x-tenant-db"];
  const tenantDatabase = (Array.isArray(header) ? header[0] : header)?.trim();
  if (!tenantDatabase) throw AppError.validation("x-tenant-db is required.");
  const claims = requireTenantAccess({
    authorization: request.headers.authorization,
    secret: env.JWT_SECRET,
    tenantDatabase,
    tenantId: request.headers["x-tenant-id"]
  });
  const database = getTenantDatabaseByName(tenantDatabase);
  return {
    actorEmail: claims.email ?? "tenant@codexsun.app",
    authorize: async (permission: string) => {
      const allowed = await database
        .selectFrom("app_users as user")
        .innerJoin("app_user_roles as userRole", "userRole.user_id", "user.id")
        .innerJoin("app_roles as role", "role.id", "userRole.role_id")
        .innerJoin("app_role_permissions as rolePermission", "rolePermission.role_id", "role.id")
        .innerJoin("app_permissions as permission", "permission.id", "rolePermission.permission_id")
        .select("permission.id")
        .where("user.email", "=", claims.email ?? "")
        .where("user.status", "=", "active")
        .where("userRole.status", "=", "active")
        .where("role.status", "=", "active")
        .where("rolePermission.status", "=", "active")
        .where("permission.status", "=", "active")
        .where("permission.key", "=", permission)
        .executeTakeFirst();
      if (!allowed) throw AppError.forbidden(`Permission ${permission} is required.`);
    },
    database,
    tenantDatabase,
    tenantId: claims.tenantId ?? ""
  };
}
