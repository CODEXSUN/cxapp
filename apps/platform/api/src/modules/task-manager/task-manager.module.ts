import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerTaskManagerRoutes } from "./task-manager.routes.js";
export const taskManagerModule = defineModule<PlatformModuleDependencies>({
  key: "platform.task-manager",
  label: "Task Manager",
  register({ app }) {
    return registerTaskManagerRoutes(app);
  }
});
