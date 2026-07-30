export type TenantUserRoleStatus = "active" | "inactive";
export type TenantUserRole = {
  id: number;
  isProtected: boolean;
  userId: number;
  userName: string;
  userEmail: string;
  roleId: number;
  roleLabel: string;
  roleKey: string;
  status: TenantUserRoleStatus;
  uuid: string;
};
export type TenantUserRoleSavePayload = {
  roleId: number;
  status: TenantUserRoleStatus;
  userId: number;
};
export type TenantUserRoleListFilters = { search?: string };
export type TenantUserRoleUserLookup = {
  id: number;
  email: string;
  name: string;
  status: string;
};
export type TenantUserRoleRoleLookup = {
  id: number;
  key: string;
  label: string;
  status: string;
};
