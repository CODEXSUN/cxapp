import { defineModule } from "@cxapp/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerPlatformRegistryRoutes } from "./platform-registry.routes.js";

export const platformRegistryModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.platform-registry",
  label: "Platform Registry",
  register({ app }) {
    return registerPlatformRegistryRoutes(app);
  }
});
