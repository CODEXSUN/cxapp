import { AsyncLocalStorage } from "node:async_hooks";
import type { FastifyRequest } from "fastify";
import { AppError } from "@cxapp/framework/errors";

export type AccountsScope = {
  companyId: number;
  financialYearId: number;
};

const storage = new AsyncLocalStorage<AccountsScope>();

export function runWithAccountsScope(
  request: FastifyRequest,
  callback: (error?: Error) => void
) {
  try {
    storage.run(readAccountsScope(request), callback);
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)));
  }
}

export function runWithAccountsScopeData<T>(
  scope: AccountsScope,
  callback: () => Promise<T>
): Promise<T> {
  return storage.run(scope, callback);
}

export function currentAccountsScope(): AccountsScope {
  const scope = storage.getStore();
  if (!scope) {
    throw AppError.validation(
      "Select an active Company and Financial Year before using Accounts."
    );
  }
  return scope;
}

export function readAccountsScope(request: FastifyRequest): AccountsScope {
  return {
    companyId: positiveHeader(request.headers["x-company-id"], "x-company-id"),
    financialYearId: positiveHeader(
      request.headers["x-financial-year-id"],
      "x-financial-year-id"
    )
  };
}

function positiveHeader(value: string | string[] | undefined, name: string) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw AppError.validation(`${name} is required and must be a positive integer.`);
  }
  return parsed;
}