import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export type TenantUserRoleStatus = "active" | "inactive";
export type TenantUserRole = {
  id: number;
  isProtected: boolean;
  roleId: number;
  roleKey: string;
  roleLabel: string;
  status: TenantUserRoleStatus;
  userEmail: string;
  userId: number;
  userName: string;
  uuid: string;
};
export type TenantUserRoleSavePayload = {
  roleId: number;
  status: TenantUserRoleStatus;
  userId: number;
};
export type TenantUserRoleListFilters = { search?: string };
export type TenantUserRoleContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
