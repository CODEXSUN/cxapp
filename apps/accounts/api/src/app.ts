import { requireTenantAccess } from "@cxapp/framework/api";
import type { FastifyInstance } from "fastify";
import { AppError } from "@cxapp/framework/errors";
import { authorizeAccountsRequest } from "./auth/tenant-permission.js";
import { runWithAccountsScope } from "./auth/accounts-scope.js";
import { env } from "./env.js";
import { overviewModule } from "./modules/overview/index.js";
import { accountingModule } from "./modules/accounting/index.js";
import { cashBookModule } from "./modules/cash-book/index.js";
import { bankBookModule } from "./modules/bank-book/index.js";

export const accountsApiModuleKeys = [
  overviewModule.key,
  accountingModule.key,
  cashBookModule.key,
  bankBookModule.key
];

export async function registerAccountsApi(app: FastifyInstance) {
  await app.register(async (accountsApp) => {
    accountsApp.addHook("onRequest", (request, _reply, done) => {
      runWithAccountsScope(request, done);
    });
    accountsApp.addHook("preHandler", async (request) => {
      const requestedDatabase = request.headers["x-tenant-db"];
      const tenantDatabase = requireTenantDatabase(
        Array.isArray(requestedDatabase) ? requestedDatabase[0] : requestedDatabase
      );
      const claims = requireTenantAccess({
        authorization: request.headers.authorization,
        secret: env.JWT_SECRET,
        tenantDatabase,
        tenantId: request.headers["x-tenant-id"]
      });
      await authorizeAccountsRequest(request, tenantDatabase, claims.email ?? "");
    });
    await overviewModule.register(accountsApp);
    await accountingModule.register(accountsApp);
    await cashBookModule.register(accountsApp);
    await bankBookModule.register(accountsApp);
  });
}

function requireTenantDatabase(value: string | undefined) {
  if (!value) throw AppError.validation("x-tenant-db is required for Accounts access.");
  return value;
}