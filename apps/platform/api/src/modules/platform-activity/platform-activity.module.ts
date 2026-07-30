import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerPlatformActivityRoutes } from "./platform-activity.routes.js";
export const platformActivityModule = defineModule<PlatformModuleDependencies>({
  key: "platform.activity",
  label: "Activity",
  register({ app }) {
    return registerPlatformActivityRoutes(app);
  }
});
