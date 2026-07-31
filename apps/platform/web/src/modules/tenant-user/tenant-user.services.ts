import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  TenantUser,
  TenantUserListFilters,
  TenantUserSavePayload,
  TenantUserScope,
  TenantUserTenantLookup
} from "./tenant-user.types";

export function listTenantUserTenants() {
  return apiGet<TenantUserTenantLookup[]>("/admin/tenants", "sa");
}

export function listTenantUsers(scope: TenantUserScope, filters: TenantUserListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<TenantUser[]>(
    `${tenantUserPath(scope)}${query.size ? `?${query}` : ""}`,
    scope.desk
  );
}
export function createTenantUser(scope: TenantUserScope, payload: TenantUserSavePayload) {
  return apiPost<TenantUser>(tenantUserPath(scope), toApi(payload), scope.desk);
}
export function updateTenantUser(
  scope: TenantUserScope,
  id: number,
  payload: TenantUserSavePayload
) {
  return apiPut<TenantUser>(`${tenantUserPath(scope)}/${id}`, toApi(payload), scope.desk);
}
export function activateTenantUser(scope: TenantUserScope, id: number) {
  return apiPost<TenantUser>(`${tenantUserPath(scope)}/${id}/activate`, {}, scope.desk);
}
export function deactivateTenantUser(scope: TenantUserScope, id: number) {
  return apiPost<TenantUser>(`${tenantUserPath(scope)}/${id}/deactivate`, {}, scope.desk);
}
export function suspendTenantUser(scope: TenantUserScope, id: number) {
  return apiPost<TenantUser>(`${tenantUserPath(scope)}/${id}/suspend`, {}, scope.desk);
}
export function forceDeleteTenantUser(scope: TenantUserScope, id: number) {
  return apiDelete<TenantUser>(`${tenantUserPath(scope)}/${id}/force`, scope.desk);
}

function tenantUserPath(scope: TenantUserScope) {
  return scope.desk === "sa" ? `/admin/tenants/${scope.tenantId}/users` : "/tenant/access/users";
}
function toApi(payload: TenantUserSavePayload) {
  const { password, ...value } = payload;
  return password ? { ...value, password } : value;
}
