import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { AuditEventDTO, Tenant, TenantRuntime, TenantSavePayload } from "./tenant.types";

export function listTenants() {
  return apiGet<Tenant[]>("/admin/tenants", "sa");
}

export function createTenant(tenant: TenantSavePayload) {
  return apiPost<Tenant>("/admin/tenants", tenant, "sa");
}

export function updateTenant(tenant: TenantSavePayload & { id: number }) {
  return apiPut<Tenant>(`/admin/tenants/${tenant.id}`, tenant, "sa");
}

export function updateTenantAppConnections(
  tenant: Tenant,
  enabledModuleKeys: string[],
  disabledModuleKeys: string[],
  defaultLandingApp: Tenant["defaultLandingApp"]
) {
  const currentApps = isRecord(tenant.payloadSettings.apps) ? tenant.payloadSettings.apps : {};
  const currentLanding = isRecord(tenant.payloadSettings.landing)
    ? tenant.payloadSettings.landing
    : {};
  return updateTenant({
    corporateId: tenant.corporateId,
    dbHost: tenant.dbHost,
    dbName: tenant.dbName,
    dbPort: tenant.dbPort,
    dbSecretRef: tenant.dbSecretRef,
    dbType: tenant.dbType,
    dbUser: tenant.dbUser,
    defaultLandingApp,
    enabledModuleKeys,
    id: tenant.id,
    mobile: tenant.mobile,
    payloadSettings: {
      ...tenant.payloadSettings,
      apps: { ...currentApps, disabled: disabledModuleKeys, enabled: enabledModuleKeys },
      landing: { ...currentLanding, app: defaultLandingApp, mode: "tenant" }
    },
    primaryDomain: tenant.primaryDomain,
    slug: tenant.slug,
    status: tenant.status,
    tenantCode: tenant.tenantCode,
    tenantName: tenant.tenantName
  });
}

export function suspendTenant(id: number | string) {
  return apiPost<Tenant>(`/admin/tenants/${id}/suspend`, {}, "sa");
}

export function restoreTenant(id: number | string) {
  return apiPost<Tenant>(`/admin/tenants/${id}/restore`, {}, "sa");
}

export function listTenantActivity(id: number | string) {
  return apiGet<AuditEventDTO[]>(`/admin/activity/tenant/${id}`, "sa");
}

export function getTenantRuntime() {
  return apiGet<TenantRuntime>("/tenant/runtime", "tenant");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
