import { AsyncLocalStorage } from "node:async_hooks";
import type { FastifyRequest } from "fastify";
import { AppError } from "@cxapp/framework/errors";

export type BillingScope = {
  canEditFinalizedEntries?: boolean;
  companyId: number;
  financialYearId: number;
};

const storage = new AsyncLocalStorage<BillingScope>();

export function runWithBillingScope(request: FastifyRequest, callback: (error?: Error) => void) {
  try {
    storage.run(readBillingScope(request), callback);
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)));
  }
}

export function withBillingScope<T>(scope: BillingScope, callback: () => T): T {
  return storage.run(scope, callback);
}

export function currentBillingScope(): BillingScope {
  const scope = storage.getStore();
  if (!scope) {
    throw AppError.validation("Select an active Company and Financial Year before using Billing.");
  }
  return scope;
}

export function assertBillingScope(companyId: number, financialYearId: number) {
  const scope = currentBillingScope();
  if (companyId !== scope.companyId || financialYearId !== scope.financialYearId) {
    throw AppError.validation(
      "The entry Company and Financial Year must match the active Billing selection."
    );
  }
  return scope;
}

/**
 * Finalised documents remain read-only for standard users. The request authorizer
 * sets this flag only after it has verified an active tenant admin role.
 */
export function setBillingFinalizedEntryEditAccess(allowed: boolean) {
  currentBillingScope().canEditFinalizedEntries = allowed;
}

export function assertBillingEntryEditable(status: string, label: string) {
  if (status === "draft" || currentBillingScope().canEditFinalizedEntries) return;
  throw AppError.conflict(`Only draft ${label} can be edited.`);
}

export function readBillingScope(request: FastifyRequest): BillingScope {
  return {
    companyId: positiveHeader(request.headers["x-company-id"], "x-company-id"),
    financialYearId: positiveHeader(request.headers["x-financial-year-id"], "x-financial-year-id")
  };
}

function positiveHeader(value: string | string[] | undefined, name: string) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw AppError.validation(`${name} is required and must be a positive integer.`);
  }
  return parsed;
}
