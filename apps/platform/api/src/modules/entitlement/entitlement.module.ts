import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerEntitlementRoutes } from "./entitlement.routes.js";

export const entitlementModule = defineModule<PlatformModuleDependencies>({
  key: "platform.entitlement",
  label: "Entitlements",
  register({ app }) {
    return registerEntitlementRoutes(app);
  }
});
