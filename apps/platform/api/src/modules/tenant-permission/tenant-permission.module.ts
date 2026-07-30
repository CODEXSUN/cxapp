import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerTenantPermissionRoutes } from "./tenant-permission.routes.js";
export const tenantPermissionModule = defineModule<PlatformModuleDependencies>({
  key: "platform.tenant-permission",
  label: "Permissions",
  register: ({ app }) => registerTenantPermissionRoutes(app)
});
