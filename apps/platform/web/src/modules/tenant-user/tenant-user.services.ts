import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { TenantUser, TenantUserListFilters, TenantUserSavePayload } from "./tenant-user.types";
const path = "/tenant/access/users";
export function listTenantUsers(filters: TenantUserListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<TenantUser[]>(`${path}${query.size ? `?${query}` : ""}`, "tenant");
}
export function createTenantUser(payload: TenantUserSavePayload) {
  return apiPost<TenantUser>(path, toApi(payload), "tenant");
}
export function updateTenantUser(id: number, payload: TenantUserSavePayload) {
  return apiPut<TenantUser>(`${path}/${id}`, toApi(payload), "tenant");
}
export function activateTenantUser(id: number) {
  return apiPost<TenantUser>(`${path}/${id}/activate`, {}, "tenant");
}
export function deactivateTenantUser(id: number) {
  return apiPost<TenantUser>(`${path}/${id}/deactivate`, {}, "tenant");
}
export function suspendTenantUser(id: number) {
  return apiPost<TenantUser>(`${path}/${id}/suspend`, {}, "tenant");
}
export function forceDeleteTenantUser(id: number) {
  return apiDelete<TenantUser>(`${path}/${id}/force`, "tenant");
}
function toApi(payload: TenantUserSavePayload) {
  const { password, ...value } = payload;
  return password ? { ...value, password } : value;
}
