import { requiredClientEnv } from "../env/client-env";
import {
  getCompanyId,
  getFinancialYearId,
  getTenantDbName,
  getTenantId,
  getToken
} from "./tenant-context";

const API_BASE_URL = requiredClientEnv("VITE_PLATFORM_API_URL");

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
  success: true;
};

export async function billingApiGet<T>(path: string) {
  return billingApiRequest<T>(path);
}

export async function billingApiPost<T>(path: string, body?: unknown) {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) init.body = JSON.stringify(body);
  return billingApiRequest<T>(path, init);
}

export async function billingApiPut<T>(path: string, body: unknown) {
  return billingApiRequest<T>(path, {
    body: JSON.stringify(body),
    method: "PUT"
  });
}

export async function billingApiDelete<T>(path: string) {
  return billingApiRequest<T>(path, { method: "DELETE" });
}

async function billingApiRequest<T>(path: string, init?: RequestInit) {
  const token = getToken("tenant");
  const tenantId = getTenantId();
  const tenantDbName = getTenantDbName();
  const companyId = getCompanyId();
  const financialYearId = getFinancialYearId();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...(tenantDbName ? { "x-tenant-db": tenantDbName } : {}),
      ...(companyId ? { "x-company-id": String(companyId) } : {}),
      ...(financialYearId ? { "x-financial-year-id": String(financialYearId) } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    let message = `Billing API request failed: ${response.status}`;
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
