import type { ColumnType, Generated } from "kysely";
import type { PlatformAppId } from "../modules/app-registry/app-registry.types.js";
import type { TenantStatus } from "../modules/tenant/tenant.types.js";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type PlatformDatabase = {
  access_permissions: AccessPermissionsTable;
  access_roles: AccessRolesTable;
  access_users: AccessUsersTable;
  auth_sessions: AuthSessionsTable;
  database_maintenance_runs: DatabaseMaintenanceRunsTable;
  entitlements: EntitlementsTable;
  industries: IndustriesTable;
  plans: PlansTable;
  platform_activity: PlatformActivityTable;
  platform_apps: PlatformAppsTable;
  platform_auth_users: PlatformAuthUsersTable;
  queue_jobs: QueueJobsTable;
  queue_runtime_settings: QueueRuntimeSettingsTable;
  password_reset_requests: PasswordResetRequestsTable;
  storage_objects: StorageObjectsTable;
  subscriptions: SubscriptionsTable;
  tenant_domains: TenantDomainsTable;
  tenant_audit_events: TenantAuditEventsTable;
  tenants: TenantsTable;
};

export type TenantDatabase = {
  app_module_settings: TenantModuleSettingsTable;
  app_permissions: TenantPermissionsTable;
  app_role_permissions: TenantRolePermissionsTable;
  app_roles: TenantRolesTable;
  app_user_roles: TenantUserRolesTable;
  app_users: TenantUsersTable;
};

export type PlatformAppsTable = {
  always_enabled: boolean | number;
  app_id: string;
  created_at: TimestampColumn;
  default_landing: boolean | number;
  description: string;
  id: Generated<number>;
  label: string;
  module_key: string;
  stack: "platform" | "billing" | "devkit" | "mail" | "platform-task-manager";
  updated_at: TimestampColumn;
  uuid: string;
};

export type AccessPermissionsTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type AccessRolesTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  key: string;
  label: string;
  permission_keys_json: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type AccessUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  name: string;
  role_key: string;
  status: "active" | "inactive" | "suspended";
  updated_at: TimestampColumn;
  uuid: string;
};

export type PlatformActivityTable = {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  module_key: string;
  record_id: number | null;
  record_label: string;
  record_uuid: string | null;
  uuid: string;
};

export type DatabaseMaintenanceRunsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  database_name: string;
  database_scope: "master" | "tenant";
  details_json: string;
  id: Generated<number>;
  operation: "backup" | "migrate" | "refresh" | "reinstall" | "restore" | "setup" | "status";
  status: "completed" | "failed" | "requested" | "running";
  target_key: string;
  uuid: string;
};

export type QueueJobsTable = {
  actor_email: string | null;
  attempts: number;
  available_at: TimestampColumn;
  completed_at: TimestampColumn | null;
  correlation_id: string | null;
  created_at: TimestampColumn;
  error_message: string | null;
  id: Generated<number>;
  idempotency_key: string | null;
  job_name: string;
  max_attempts: number;
  payload_json: string;
  priority: number;
  queue_name: string;
  result_json: string;
  source_module: string;
  started_at: TimestampColumn | null;
  status: "cancelled" | "completed" | "failed" | "pending" | "running";
  tenant_id: string | null;
  updated_at: TimestampColumn;
  uuid: string;
};

export type QueueRuntimeSettingsTable = {
  backend: "bullmq-redis" | "database" | "memory";
  id: Generated<number>;
  singleton_key: number;
  updated_at: TimestampColumn;
  updated_by: string;
};

export type PlatformAuthUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  name: string;
  password_hash: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  user_type: "staff" | "super_admin";
  uuid: string;
};

export type AuthSessionsTable = {
  context_json: string;
  created_at: TimestampColumn;
  expires_at: TimestampColumn;
  id: Generated<number>;
  jti: string;
  last_seen_at: TimestampColumn;
  login_host: string;
  revoked_at: TimestampColumn | null;
  tenant_access_mode: "custom_domain" | "platform" | "shared_domain";
  tenant_code: string | null;
  tenant_db_name: string | null;
  tenant_id: string | null;
  updated_at: TimestampColumn;
  user_email: string;
  user_name: string | null;
  user_type: "staff" | "super_admin" | "tenant";
  user_uuid: string;
  uuid: string;
};

export type PasswordResetRequestsTable = {
  consumed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  desk: "admin" | "sa" | "tenant";
  email: string;
  expires_at: TimestampColumn;
  id: Generated<number>;
  tenant_database: string | null;
  tenant_id: string | null;
  token_hash: string;
  user_uuid: string;
  uuid: string;
};

export type StorageObjectsTable = {
  checksum: string | null;
  created_at: TimestampColumn;
  disk_path: string;
  id: Generated<number>;
  mime_type: string | null;
  object_type: "file" | "folder";
  relative_path: string;
  scope: "app" | "tenant";
  size_bytes: number;
  tenant_id: number | null;
  updated_at: TimestampColumn;
  uuid: string;
  visibility: "private" | "public";
};

export type PlansTable = {
  annual_price: number;
  code: string;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  limits_json: string;
  monthly_price: number;
  name: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type SubscriptionsTable = {
  billing_cycle: "monthly" | "annual";
  created_at: TimestampColumn;
  ends_on: string | null;
  id: Generated<number>;
  plan_id: number;
  starts_on: string;
  status: "active" | "cancelled" | "expired" | "trial";
  tenant_id: number;
  updated_at: TimestampColumn;
  uuid: string;
};

export type IndustriesTable = {
  code: string;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  module_keys_json: string;
  name: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type EntitlementsTable = {
  app_id: number;
  created_at: TimestampColumn;
  ends_on: string | null;
  id: Generated<number>;
  module_key: string;
  plan_id: number | null;
  scope: "tenant" | "plan";
  source: "manual" | "seed" | "subscription";
  starts_on: string;
  status: "active" | "inactive";
  tenant_id: number | null;
  updated_at: TimestampColumn;
  uuid: string;
};

export type PlatformMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
};

export type TenantsTable = {
  corporate_id: string | null;
  created_at: TimestampColumn;
  db_host: string;
  db_name: string;
  db_port: number;
  db_secret_ref: string;
  db_type: string;
  db_user: string;
  default_landing_app: PlatformAppId;
  enabled_module_keys: string;
  id: Generated<number>;
  mobile: string | null;
  payload_settings: string;
  slug: string;
  status: TenantStatus;
  storage_private_root: string;
  storage_public_root: string;
  storage_root: string;
  tenant_code: string;
  tenant_name: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantAuditEventsTable = {
  actor_email: string;
  created_at: TimestampColumn;
  event_name: string;
  id: Generated<number>;
  tenant_id: number;
  uuid: string;
};

export type TenantDomainsTable = {
  created_at: TimestampColumn;
  domain: string;
  id: Generated<number>;
  is_primary: boolean | number;
  status: "active" | "disabled";
  tenant_id: number;
  uuid: string;
  verification_status: "pending" | "verified";
  verification_token_hash: string | null;
  verified_at: TimestampColumn | null;
};

export type TenantMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
};

export type TenantModuleSettingsTable = {
  created_at: TimestampColumn;
  enabled: boolean | number;
  id: Generated<number>;
  module_key: string;
  settings_json: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  is_protected: boolean | number;
  name: string;
  password_hash: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantRolesTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantPermissionsTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantRolePermissionsTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  permission_id: number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantUserRolesTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  user_id: number;
  uuid: string;
};
