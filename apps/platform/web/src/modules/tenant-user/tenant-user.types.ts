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
export type TenantUserScope = { desk: "tenant" } | { desk: "sa"; tenantId: number };
export type TenantUserTenantLookup = {
  id: number;
  status: string;
  tenantCode: string;
  tenantName: string;
};
