import { requireTenantAccess } from "@codexsun/framework/api";
import type { FastifyInstance } from "fastify";
import { authorizeCoreRequest } from "./auth/tenant-permission.js";
import {
  bootstrapCoreDatabase,
  resolveCoreDatabaseName,
  runWithCoreDatabase
} from "./database/core-database.js";
import { env } from "./env.js";
import { commonModule } from "./modules/common/index.js";
import { locationModules } from "./modules/common/location/location.module.js";
import { masterModule } from "./modules/master/index.js";
import { organisationModule } from "./modules/organisation/index.js";

export const coreApiModuleKeys = [
  commonModule.key,
  organisationModule.key,
  masterModule.key,
  ...locationModules.map((module) => module.key)
];

export async function registerCoreApi(app: FastifyInstance) {
  await app.register(async (coreApp) => {
    coreApp.addHook("onRequest", (request, _reply, done) => {
      try {
        const value = request.headers["x-tenant-db"];
        const databaseName = resolveCoreDatabaseName(Array.isArray(value) ? value[0] : value);
        runWithCoreDatabase(databaseName, done);
      } catch (error) {
        done(error as Error);
      }
    });
    coreApp.addHook("preHandler", async (request) => {
      const value = request.headers["x-tenant-db"];
      const tenantDatabase = resolveCoreDatabaseName(Array.isArray(value) ? value[0] : value);
      const claims = requireTenantAccess({
        authorization: request.headers.authorization,
        secret: env.JWT_SECRET,
        tenantDatabase,
        tenantId: request.headers["x-tenant-id"]
      });
      await bootstrapCoreDatabase(tenantDatabase);
      await authorizeCoreRequest(request, tenantDatabase, claims.email ?? "");
    });
    await commonModule.register(coreApp);
    await organisationModule.register(coreApp);
    await masterModule.register(coreApp);
  });
}
