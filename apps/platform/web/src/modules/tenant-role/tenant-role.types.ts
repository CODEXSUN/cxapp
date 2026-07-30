export type TenantRoleStatus = "active" | "inactive";
export type TenantRole = {
  id: number;
  isProtected: boolean;
  description: string;
  key: string;
  label: string;
  status: TenantRoleStatus;
  uuid: string;
};
export type TenantRoleSavePayload = {
  description: string;
  key: string;
  label: string;
  status: TenantRoleStatus;
};
export type TenantRoleListFilters = { search?: string };
