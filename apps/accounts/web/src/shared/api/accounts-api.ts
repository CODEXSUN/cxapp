import { requiredClientEnv } from "../env/client-env";
import { getCompanyId, getFinancialYearId, getTenantDbName, getTenantId } from "./tenant-context";

const API_BASE_URL = requiredClientEnv("VITE_PLATFORM_API_URL");

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
  success: true;
};

export async function accountsApiGet<T>(path: string, init?: RequestInit) {
  return accountsApiRequest<T>(path, init);
}

export async function accountsApiPost<T>(path: string, body?: unknown) {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) init.body = JSON.stringify(body);
  return accountsApiRequest<T>(path, init);
}

export async function accountsApiPut<T>(path: string, body: unknown) {
  return accountsApiRequest<T>(path, {
    body: JSON.stringify(body),
    method: "PUT"
  });
}

export async function accountsApiPatch<T>(path: string, body: unknown) {
  return accountsApiRequest<T>(path, {
    body: JSON.stringify(body),
    method: "PATCH"
  });
}

export async function accountsApiDelete<T>(path: string) {
  return accountsApiRequest<T>(path, { method: "DELETE" });
}

async function accountsApiRequest<T>(path: string, init?: RequestInit) {
  const tenantId = getTenantId();
  const tenantDbName = getTenantDbName();
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...(tenantDbName ? { "x-tenant-db": tenantDbName } : {}),
      ...(companyId ? { "x-company-id": String(companyId) } : {}),
      ...(financialYearId ? { "x-financial-year-id": String(financialYearId) } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    let message = `Accounts API request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // Keep the status-based fallback.
    }
    throw new Error(message);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return envelope.data;
}
