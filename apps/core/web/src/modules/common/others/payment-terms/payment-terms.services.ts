import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  PaymentTermsListFilters,
  PaymentTermsRecord,
  PaymentTermsSavePayload
} from "./payment-terms.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const paymentTermsPath = "/core/common/others/payment-terms";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function paymentTermsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${paymentTermsPath}${suffix}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantDbName ? { "x-tenant-db": tenantDbName } : {}),
      ...(getTenantId() ? { "x-tenant-id": getTenantId()! } : {}),
      ...options.headers
    }
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.success ? "PaymentTerms request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listPaymentTerms(filters: PaymentTermsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return paymentTermsRequest<PaymentTermsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createPaymentTerms(payload: PaymentTermsSavePayload) {
  return paymentTermsRequest<PaymentTermsRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updatePaymentTerms(id: number, payload: PaymentTermsSavePayload) {
  return paymentTermsRequest<PaymentTermsRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activatePaymentTerms(id: number) {
  return paymentTermsRequest<PaymentTermsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivatePaymentTerms(id: number) {
  return paymentTermsRequest<PaymentTermsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeletePaymentTerms(id: number) {
  return paymentTermsRequest<PaymentTermsRecord>(`/${id}/force`, { method: "DELETE" });
}
