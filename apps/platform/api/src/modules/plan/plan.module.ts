import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerPlanRoutes } from "./plan.routes.js";
export const planModule = defineModule<PlatformModuleDependencies>({
  key: "platform.plan",
  label: "Plans",
  register({ app }) {
    return registerPlanRoutes(app);
  }
});
