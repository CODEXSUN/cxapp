export type TenantPermissionStatus = "active" | "inactive";
export type TenantPermission = {
  id: number;
  isProtected: boolean;
  description: string;
  key: string;
  label: string;
  status: TenantPermissionStatus;
  uuid: string;
};
export type TenantPermissionSavePayload = {
  description: string;
  key: string;
  label: string;
  status: TenantPermissionStatus;
};
export type TenantPermissionListFilters = { search?: string };
