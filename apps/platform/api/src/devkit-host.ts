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
import type { PlatformDatabase } from "./database/schema.js";

export const devkitHostAdapter: DevkitHostAdapter = {
  async authorize({ context }) {
    if (context.actor.roles.includes("super_admin")) return;
    throw AppError.forbidden("DevKit is available only to Super Admin.");
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
  throw AppError.forbidden("DevKit is available only to Super Admin.");
}

function devkitDatabase(database: Kysely<PlatformDatabase>): Kysely<DevkitDatabase> {
  return database as unknown as Kysely<DevkitDatabase>;
}
