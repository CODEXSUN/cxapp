export type TenantRolePermissionStatus = "active" | "inactive";
export type TenantRolePermission = {
  id: number;
  isProtected: boolean;
  roleId: number;
  roleLabel: string;
  roleKey: string;
  permissionId: number;
  permissionLabel: string;
  permissionKey: string;
  status: TenantRolePermissionStatus;
  uuid: string;
};
export type TenantRolePermissionSavePayload = {
  permissionId: number;
  roleId: number;
  status: TenantRolePermissionStatus;
};
export type TenantRolePermissionListFilters = { search?: string };
export type TenantRolePermissionRoleLookup = {
  id: number;
  key: string;
  label: string;
  status: string;
};
export type TenantRolePermissionPermissionLookup = {
  id: number;
  key: string;
  label: string;
  status: string;
};
