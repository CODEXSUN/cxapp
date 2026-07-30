import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerTenantRolePermissionRoutes } from "./tenant-role-permission.routes.js";
export const tenantRolePermissionModule = defineModule<PlatformModuleDependencies>({
  key: "platform.tenant-role-permission",
  label: "Role Permissions",
  register: ({ app }) => registerTenantRolePermissionRoutes(app)
});
