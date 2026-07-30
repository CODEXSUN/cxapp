import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerAppRegistryRoutes } from "./app-registry.routes.js";

export const appRegistryModule = defineModule<PlatformModuleDependencies>({
  key: "platform.app-registry",
  label: "App Registry",
  register({ app }) {
    return registerAppRegistryRoutes(app);
  }
});
