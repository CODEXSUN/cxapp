import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  TenantUserRole,
  TenantUserRoleListFilters,
  TenantUserRoleRoleLookup,
  TenantUserRoleSavePayload,
  TenantUserRoleUserLookup
} from "./tenant-user-role.types";
const path = "/tenant/access/user-roles";
export function listTenantUserRoles(filters: TenantUserRoleListFilters = {}) {
  const q = new URLSearchParams();
  if (filters.search?.trim()) q.set("search", filters.search.trim());
  return apiGet<TenantUserRole[]>(`${path}${q.size ? `?${q}` : ""}`, "tenant");
}
export function listUserOptions() {
  return apiGet<TenantUserRoleUserLookup[]>("/tenant/access/users", "tenant");
}
export function listRoleOptions() {
  return apiGet<TenantUserRoleRoleLookup[]>("/tenant/access/roles", "tenant");
}
export function createTenantUserRole(payload: TenantUserRoleSavePayload) {
  return apiPost<TenantUserRole>(path, toApi(payload), "tenant");
}
export function updateTenantUserRole(id: number, payload: TenantUserRoleSavePayload) {
  return apiPut<TenantUserRole>(`${path}/${id}`, toApi(payload), "tenant");
}
export function activateTenantUserRole(id: number) {
  return apiPost<TenantUserRole>(`${path}/${id}/activate`, {}, "tenant");
}
export function deactivateTenantUserRole(id: number) {
  return apiPost<TenantUserRole>(`${path}/${id}/deactivate`, {}, "tenant");
}
export function forceDeleteTenantUserRole(id: number) {
  return apiDelete<TenantUserRole>(`${path}/${id}/force`, "tenant");
}
function toApi(payload: TenantUserRoleSavePayload) {
  return payload;
}
