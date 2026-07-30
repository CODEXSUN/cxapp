import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerStorageManagerRoutes } from "./storage-manager.routes.js";

export const storageManagerModule = defineModule<PlatformModuleDependencies>({
  key: "platform.storage-manager",
  label: "Storage Manager",
  register({ app }) {
    return registerStorageManagerRoutes(app);
  }
});
