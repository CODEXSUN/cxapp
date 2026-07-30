import { apiGet, apiPost } from "../../shared/api/platform-api";
import type {
  AccessControlOverview,
  AccessPermission,
  AccessPermissionSavePayload,
  AccessRole,
  AccessRoleSavePayload,
  AccessUser,
  AccessUserSavePayload
} from "./access-control.types";

export function getAccessControl() {
  return apiGet<AccessControlOverview>("/admin/access-control", "sa");
}
export function saveAccessPermission(payload: AccessPermissionSavePayload) {
  return apiPost<AccessPermission>("/admin/access-control/permissions", payload, "sa");
}
export function saveAccessRole(payload: AccessRoleSavePayload) {
  return apiPost<AccessRole>("/admin/access-control/roles", payload, "sa");
}
export function saveAccessUser(payload: AccessUserSavePayload) {
  return apiPost<AccessUser>("/admin/access-control/users", payload, "sa");
}
