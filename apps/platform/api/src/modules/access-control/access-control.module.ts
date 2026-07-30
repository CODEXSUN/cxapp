import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerAccessControlRoutes } from "./access-control.routes.js";
export const accessControlModule = defineModule<PlatformModuleDependencies>({
  key: "platform.access-control",
  label: "Access Control",
  register({ app }) {
    return registerAccessControlRoutes(app);
  }
});
