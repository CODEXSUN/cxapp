import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export type TenantRolePermissionStatus = "active" | "inactive";
export type TenantRolePermission = {
  id: number;
  isProtected: boolean;
  permissionId: number;
  permissionKey: string;
  permissionLabel: string;
  roleId: number;
  roleKey: string;
  roleLabel: string;
  status: TenantRolePermissionStatus;
  uuid: string;
};
export type TenantRolePermissionSavePayload = {
  permissionId: number;
  roleId: number;
  status: TenantRolePermissionStatus;
};
export type TenantRolePermissionListFilters = { search?: string };
export type TenantRolePermissionContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
