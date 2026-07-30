import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { TenantRole, TenantRoleListFilters, TenantRoleSavePayload } from "./tenant-role.types";
const path = "/tenant/access/roles";
export function listTenantRoles(filters: TenantRoleListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<TenantRole[]>(`${path}${query.size ? `?${query}` : ""}`, "tenant");
}
export function createTenantRole(payload: TenantRoleSavePayload) {
  return apiPost<TenantRole>(path, toApi(payload), "tenant");
}
export function updateTenantRole(id: number, payload: TenantRoleSavePayload) {
  return apiPut<TenantRole>(`${path}/${id}`, toApi(payload), "tenant");
}
export function activateTenantRole(id: number) {
  return apiPost<TenantRole>(`${path}/${id}/activate`, {}, "tenant");
}
export function deactivateTenantRole(id: number) {
  return apiPost<TenantRole>(`${path}/${id}/deactivate`, {}, "tenant");
}
export function forceDeleteTenantRole(id: number) {
  return apiDelete<TenantRole>(`${path}/${id}/force`, "tenant");
}
function toApi(payload: TenantRoleSavePayload) {
  return payload;
}
