import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  TenantRolePermission,
  TenantRolePermissionListFilters,
  TenantRolePermissionPermissionLookup,
  TenantRolePermissionRoleLookup,
  TenantRolePermissionSavePayload
} from "./tenant-role-permission.types";
const path = "/tenant/access/role-permissions";
export function listTenantRolePermissions(filters: TenantRolePermissionListFilters = {}) {
  const q = new URLSearchParams();
  if (filters.search?.trim()) q.set("search", filters.search.trim());
  return apiGet<TenantRolePermission[]>(`${path}${q.size ? `?${q}` : ""}`, "tenant");
}
export function listRoleOptions() {
  return apiGet<TenantRolePermissionRoleLookup[]>("/tenant/access/roles", "tenant");
}
export function listPermissionOptions() {
  return apiGet<TenantRolePermissionPermissionLookup[]>("/tenant/access/permissions", "tenant");
}
export function createTenantRolePermission(payload: TenantRolePermissionSavePayload) {
  return apiPost<TenantRolePermission>(path, toApi(payload), "tenant");
}
export function updateTenantRolePermission(id: number, payload: TenantRolePermissionSavePayload) {
  return apiPut<TenantRolePermission>(`${path}/${id}`, toApi(payload), "tenant");
}
export function activateTenantRolePermission(id: number) {
  return apiPost<TenantRolePermission>(`${path}/${id}/activate`, {}, "tenant");
}
export function deactivateTenantRolePermission(id: number) {
  return apiPost<TenantRolePermission>(`${path}/${id}/deactivate`, {}, "tenant");
}
export function forceDeleteTenantRolePermission(id: number) {
  return apiDelete<TenantRolePermission>(`${path}/${id}/force`, "tenant");
}
function toApi(payload: TenantRolePermissionSavePayload) {
  return payload;
}
