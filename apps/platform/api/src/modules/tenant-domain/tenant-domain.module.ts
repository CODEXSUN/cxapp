import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerTenantDomainRoutes } from "./tenant-domain.routes.js";

export const tenantDomainModule = defineModule<PlatformModuleDependencies>({
  key: "platform.tenant-domain",
  label: "Tenant Domain",
  async register({ app }) {
    await registerTenantDomainRoutes(app);
  }
});
