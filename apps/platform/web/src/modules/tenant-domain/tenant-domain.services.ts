import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Tenant } from "../tenant/tenant.types";
import type {
  TenantDomain,
  TenantDomainRecord,
  TenantDomainSavePayload,
  TenantPrimaryDomainPayload
} from "./tenant-domain.types";

export function listAllTenantDomains() {
  return apiGet<TenantDomainRecord[]>("/admin/tenant-domains", "sa");
}

export function createTenantDomain(payload: TenantDomainSavePayload) {
  return apiPost<TenantDomainRecord>("/admin/tenant-domains", payload, "sa");
}

export function updateTenantDomain(id: number, payload: TenantDomainSavePayload) {
  return apiPut<TenantDomainRecord>(`/admin/tenant-domains/${id}`, payload, "sa");
}

export function listTenantDomains(tenantId: number | string) {
  return apiGet<TenantDomain[]>(`/admin/tenants/${tenantId}/domains`, "sa");
}

export function updateTenantPrimaryDomain(
  tenantId: number | string,
  payload: TenantPrimaryDomainPayload
) {
  return apiPut<Tenant>(`/admin/tenants/${tenantId}/domains/primary`, payload, "sa");
}

export function normalizeTenantDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function defaultTenantDomain(value: string) {
  const slug = tenantDomainSlug(value);
  return slug ? `${slug}.localhost` : "localhost";
}

function tenantDomainSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
