import type { FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import {
  registerDevkitApiForHost,
  type DevkitDatabase,
  type DevkitHostAdapter,
  type DevkitHostRequestContext
} from "@cxapp/devkit-api";
import { AppError } from "@cxapp/framework/errors";
import { getPlatformDatabase } from "./database/platform-database.js";
import { tenantAccessContext } from "./auth/tenant-access-context.js";
import type { PlatformDatabase, TenantDatabase } from "./database/schema.js";

export const devkitHostAdapter: DevkitHostAdapter = {
  async authorize({ context }) {
    if (context.actor.roles.includes("super_admin")) return;
    if (!context.actor.permissions.includes("devkit.access")) {
      throw AppError.forbidden("DevKit access is not enabled for this tenant user.");
    }
  },
  async resolve(request) {
    return resolveDevkitContext(request);
  }
};

export async function registerDevkitHost(app: Parameters<typeof registerDevkitApiForHost>[0]) {
  await registerDevkitApiForHost(app, devkitHostAdapter);
}

async function resolveDevkitContext(request: FastifyRequest): Promise<DevkitHostRequestContext> {
  const payload = request.authContext?.payload;
  if (payload?.userType === "super_admin") {
    return {
      actor: {
        email: payload.email,
        id: payload.userId,
        permissions: ["devkit.access"],
        roles: ["super_admin"],
        storageScope: "master"
      },
      database: devkitDatabase(getPlatformDatabase())
    };
  }
  if (payload?.userType !== "tenant") {
    throw AppError.forbidden("DevKit requires a Super Admin or tenant session.");
  }

  const tenant = tenantAccessContext(request);
  const module = await tenant.database
    .selectFrom("app_module_settings")
    .select(["enabled", "status"])
    .where("module_key", "=", "devkit")
    .executeTakeFirst();
  if (!module || !module.enabled || module.status !== "active") {
    throw AppError.forbidden("DevKit is not enabled for this tenant.");
  }
  await tenant.authorize("devkit.access");
  return {
    actor: {
      email: tenant.actorEmail,
      id: payload.userId,
      permissions: ["devkit.access"],
      roles: ["tenant"],
      storageScope: `tenant-${tenant.tenantId}`
    },
    database: devkitDatabase(tenant.database)
  };
}

function devkitDatabase(
  database: Kysely<PlatformDatabase> | Kysely<TenantDatabase>
): Kysely<DevkitDatabase> {
  return database as unknown as Kysely<DevkitDatabase>;
}
