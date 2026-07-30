import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerQueueManagerRoutes } from "./queue-manager.routes.js";

export const queueManagerModule = defineModule<PlatformModuleDependencies>({
  key: "platform.queue-manager",
  label: "Queue Manager",
  register({ app }) {
    return registerQueueManagerRoutes(app);
  }
});
