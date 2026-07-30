import { createApiApp, registerHealthRoute, registerRequestLogging } from "@codexsun/framework/api";
import { registerModules } from "@codexsun/framework/modules";
import { createMailModule } from "@codexsun/mail-api";
import {
  billingApiModuleKeys,
  closeAllBillingDatabases,
  registerBillingApi
} from "@codexsun/billing-api";
import { closeCoreDatabase, coreApiModuleKeys, registerCoreApi } from "@codexsun/core-api";
import { AppError } from "@codexsun/framework/errors";
import type { FastifyRequest } from "fastify";
import type { HealthCheck } from "@codexsun/framework/health";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { appRegistryModule } from "./modules/app-registry/index.js";
import { tenantDomainModule } from "./modules/tenant-domain/index.js";
import { tenantModule } from "./modules/tenant/index.js";
import { tenantUserModule } from "./modules/tenant-user/index.js";
import { tenantRoleModule } from "./modules/tenant-role/index.js";
import { tenantPermissionModule } from "./modules/tenant-permission/index.js";
import { tenantUserRoleModule } from "./modules/tenant-user-role/index.js";
import { tenantRolePermissionModule } from "./modules/tenant-role-permission/index.js";
import { planModule } from "./modules/plan/index.js";
import { subscriptionModule } from "./modules/subscription/index.js";
import { industryModule } from "./modules/industry/index.js";
import { entitlementModule } from "./modules/entitlement/index.js";
import { accessControlModule } from "./modules/access-control/index.js";
import { platformActivityModule } from "./modules/platform-activity/index.js";
import { databaseMaintenanceModule } from "./modules/database-maintenance/index.js";
import { queueManagerModule } from "./modules/queue-manager/index.js";
import { storageManagerModule } from "./modules/storage-manager/index.js";
import { taskManagerModule } from "./modules/task-manager/index.js";
import { credentialRecoveryModule } from "./modules/credential-recovery/index.js";
import { appOrchestrationModule } from "./modules/app-orchestration/index.js";
import { startQueueManagerWorker } from "./modules/queue-manager/queue-manager.runtime.js";
import { QueueManagerService } from "./modules/queue-manager/queue-manager.service.js";
import { tenantAccessContext } from "./auth/tenant-access-context.js";
import { seedDefaultTenant } from "./modules/tenant/tenant.seed.js";
import { env } from "./env.js";
import { bootstrapPlatformDatabase, closePlatformDatabase } from "./database/platform-database.js";
import { closeAllTenantDatabases } from "./database/tenant-database.js";

export async function createApp() {
  console.info("[platform.boot] bootstrap started");
  await bootstrapPlatformDatabase();
  await seedDefaultTenant();

  const app = await createApiApp({
    appName: "CODEXSUN Platform API",
    cookieSecret: env.JWT_SECRET,
    corsOrigins: platformWebOrigins(),
    environment: env.NODE_ENV,
    shutdownHooks: [
      async () => {
        console.info("[shutdown] closing Billing tenant MariaDB pools");
        await closeAllBillingDatabases();
      },
      async () => {
        console.info("[shutdown] closing Core tenant MariaDB pools");
        await closeCoreDatabase();
      },
      async () => {
        console.info("[shutdown] closing tenant MariaDB pools");
        await closeAllTenantDatabases();
      },
      async () => {
        console.info("[shutdown] closing platform MariaDB pools");
        await closePlatformDatabase();
      }
    ]
  });
  const queueService = new QueueManagerService();
  const mailModule = createMailModule({
    enqueue: (payload) => queueService.enqueue(payload),
    resolveContext: mailContext,
    secretKey: env.JWT_SECRET
  });

  const healthChecks: HealthCheck[] = [
    {
      name: "platform-api",
      check: () => ({
        details: {
          modules: [
            ...coreApiModuleKeys,
            ...billingApiModuleKeys,
            appRegistryModule.key,
            tenantModule.key,
            tenantUserModule.key,
            tenantRoleModule.key,
            tenantPermissionModule.key,
            tenantUserRoleModule.key,
            tenantRolePermissionModule.key,
            tenantDomainModule.key,
            planModule.key,
            subscriptionModule.key,
            industryModule.key,
            entitlementModule.key,
            accessControlModule.key,
            platformActivityModule.key,
            databaseMaintenanceModule.key,
            queueManagerModule.key,
            credentialRecoveryModule.key,
            storageManagerModule.key,
            taskManagerModule.key,
            appOrchestrationModule.key,
            mailModule.key
          ],
          runtime: "platform-foundation"
        },
        status: "ok"
      })
    }
  ];

  registerRequestLogging(app);
  registerHealthRoute(app, healthChecks);
  console.info("[platform.routes] health ready");
  await registerAuthRoutes(app);
  console.info("[platform.routes] auth ready");
  await registerCoreApi(app);
  console.info("[platform.routes] Core package ready");
  await registerBillingApi(app);
  console.info("[platform.routes] Billing package ready");
  await registerModules(
    [
      appRegistryModule,
      tenantModule,
      tenantUserModule,
      tenantRoleModule,
      tenantPermissionModule,
      tenantUserRoleModule,
      tenantRolePermissionModule,
      tenantDomainModule,
      planModule,
      subscriptionModule,
      industryModule,
      entitlementModule,
      accessControlModule,
      platformActivityModule,
      databaseMaintenanceModule,
      queueManagerModule,
      credentialRecoveryModule,
      storageManagerModule,
      taskManagerModule,
      appOrchestrationModule,
      mailModule
    ],
    { app },
    {
      onRegister: (module) => console.info(`[module.register] ${module.key}`),
      onReady: (module) => console.info(`[module.ready] ${module.key}`)
    }
  );
  startQueueManagerWorker(app, queueService);
  console.info("[platform.worker] queue manager ready");
  console.info("[platform.boot] bootstrap completed");

  return app;
}

function platformWebOrigins() {
  const configuredOrigins = [env.PLATFORM_WEB_ORIGIN, ...env.PLATFORM_WEB_ORIGINS.split(",")];
  if (env.NODE_ENV !== "production") {
    configuredOrigins.push(
      `http://127.0.0.1:${env.PLATFORM_WEB_PORT}`,
      `http://localhost:${env.PLATFORM_WEB_PORT}`
    );
  }

  return Array.from(
    new Set(
      configuredOrigins
        .map((origin) => origin.trim())
        .filter(Boolean)
        .flatMap(localOriginAliases)
        .map((origin) => origin.trim().replace(/\/$/u, ""))
    )
  );
}

function localOriginAliases(origin: string) {
  const origins = [origin];
  const url = new URL(origin);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    origins.push(url.origin);
  } else if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    origins.push(url.origin);
  }
  return origins;
}

async function mailContext(request: FastifyRequest) {
  const context = tenantAccessContext(request);
  const header = request.headers["x-company-id"];
  const companyId = Number(Array.isArray(header) ? header[0] : header);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    throw AppError.validation("x-company-id is required for Mail access.");
  }
  return { ...context, companyId, database: context.database as never };
}
