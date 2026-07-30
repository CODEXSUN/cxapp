export { tenantPermissionModule } from "./tenant-permission.module.js";
export {
  migrateTenantPermissionModule,
  tenantPermissionMigration
} from "./tenant-permission.migration.js";
export { seedTenantPermissionModule } from "./tenant-permission.seed.js";
export type {
  TenantPermission,
  TenantPermissionSavePayload,
  TenantPermissionStatus
} from "./tenant-permission.types.js";
