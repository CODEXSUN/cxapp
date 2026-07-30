import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export type TenantPermissionStatus = "active" | "inactive";
export type TenantPermission = {
  description: string;
  id: number;
  isProtected: boolean;
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
export type TenantPermissionContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
