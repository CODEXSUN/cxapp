import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerIndustryRoutes } from "./industry.routes.js";
export const industryModule = defineModule<PlatformModuleDependencies>({
  key: "platform.industry",
  label: "Industries",
  register({ app }) {
    return registerIndustryRoutes(app);
  }
});
