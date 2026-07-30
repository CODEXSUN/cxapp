import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerAppOrchestrationRoutes } from "./app-orchestration.routes.js";
export const appOrchestrationModule = defineModule<PlatformModuleDependencies>({
  key: "platform.app-orchestration",
  label: "App Operations",
  register({ app }) {
    return registerAppOrchestrationRoutes(app);
  }
});
