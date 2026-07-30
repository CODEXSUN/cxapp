export type AccessPermission = {
  description: string;
  id: number;
  key: string;
  label: string;
  status: "active" | "inactive";
  uuid: string;
};
export type AccessRole = {
  description: string;
  id: number;
  key: string;
  label: string;
  permissionKeys: string[];
  status: "active" | "inactive";
  uuid: string;
};
export type AccessUser = {
  email: string;
  id: number;
  name: string;
  roleKey: string;
  status: "active" | "inactive" | "suspended";
  uuid: string;
};
export type AccessControlOverview = {
  permissions: AccessPermission[];
  roles: AccessRole[];
  users: AccessUser[];
};
export type AccessPermissionSavePayload = Omit<AccessPermission, "id" | "uuid">;
export type AccessRoleSavePayload = Omit<AccessRole, "id" | "permissionKeys" | "uuid"> & {
  permissionKeysText: string;
};
export type AccessUserSavePayload = Omit<AccessUser, "id" | "uuid">;
