import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type TenantUserStatus = "active" | "inactive" | "suspended";
export type TenantUser = {
  email: string;
  id: number;
  isProtected: boolean;
  name: string;
  status: TenantUserStatus;
  uuid: string;
};
export type TenantUserSavePayload = {
  email: string;
  name: string;
  password?: string | undefined;
  status: TenantUserStatus;
};
export type TenantUserListFilters = { search?: string };
export type TenantUserContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
