import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  TenantPermission,
  TenantPermissionListFilters,
  TenantPermissionSavePayload
} from "./tenant-permission.types";
const path = "/tenant/access/permissions";
export function listTenantPermissions(filters: TenantPermissionListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<TenantPermission[]>(`${path}${query.size ? `?${query}` : ""}`, "tenant");
}
export function createTenantPermission(payload: TenantPermissionSavePayload) {
  return apiPost<TenantPermission>(path, toApi(payload), "tenant");
}
export function updateTenantPermission(id: number, payload: TenantPermissionSavePayload) {
  return apiPut<TenantPermission>(`${path}/${id}`, toApi(payload), "tenant");
}
export function activateTenantPermission(id: number) {
  return apiPost<TenantPermission>(`${path}/${id}/activate`, {}, "tenant");
}
export function deactivateTenantPermission(id: number) {
  return apiPost<TenantPermission>(`${path}/${id}/deactivate`, {}, "tenant");
}
export function forceDeleteTenantPermission(id: number) {
  return apiDelete<TenantPermission>(`${path}/${id}/force`, "tenant");
}
function toApi(payload: TenantPermissionSavePayload) {
  return payload;
}
