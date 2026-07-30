import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerTenantRoutes } from "./tenant.routes.js";

export const tenantModule = defineModule<PlatformModuleDependencies>({
  key: "platform.tenant",
  label: "Tenant",
  async register({ app }) {
    await registerTenantRoutes(app);
  }
});
