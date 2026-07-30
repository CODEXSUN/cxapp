export type AccessStatus = "active" | "inactive";
export type AccessUserStatus = AccessStatus | "suspended";

export type AccessPermission = {
  description: string;
  id: number;
  key: string;
  label: string;
  status: AccessStatus;
  uuid: string;
};

export type AccessRole = {
  description: string;
  id: number;
  key: string;
  label: string;
  permissionKeys: string[];
  status: AccessStatus;
  uuid: string;
};

export type AccessUser = {
  email: string;
  id: number;
  name: string;
  roleKey: string;
  status: AccessUserStatus;
  uuid: string;
};

export type AccessPermissionSavePayload = Omit<AccessPermission, "id" | "uuid">;
export type AccessRoleSavePayload = Omit<AccessRole, "id" | "permissionKeys" | "uuid"> & {
  permissionKeysText: string;
};
export type AccessUserSavePayload = Omit<AccessUser, "id" | "uuid">;
export type AccessControlOverview = {
  permissions: AccessPermission[];
  roles: AccessRole[];
  users: AccessUser[];
};
