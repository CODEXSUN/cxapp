import type { TenantSavePayload } from "./tenant.types";

export function validateTenantPayload(payload: TenantSavePayload) {
  if (!payload.tenantName.trim()) return "Tenant name is required.";
  if (!payload.tenantCode.trim()) return "Tenant code is required.";
  if (!payload.primaryDomain.trim()) return "Primary domain is required.";
  return "";
}
