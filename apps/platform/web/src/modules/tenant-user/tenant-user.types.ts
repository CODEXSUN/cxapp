export type TenantUserStatus = "active" | "inactive" | "suspended";
export type TenantUser = {
  id: number;
  isProtected: boolean;
  email: string;
  name: string;
  password?: string;
  status: TenantUserStatus;
  uuid: string;
};
export type TenantUserSavePayload = {
  email: string;
  name: string;
  password?: string;
  status: TenantUserStatus;
};
export type TenantUserListFilters = { search?: string };
