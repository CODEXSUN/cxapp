import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerDatabaseMaintenanceRoutes } from "./database-maintenance.routes.js";
export const databaseMaintenanceModule = defineModule<PlatformModuleDependencies>({
  key: "platform.database-maintenance",
  label: "Database Maintenance",
  register({ app }) {
    return registerDatabaseMaintenanceRoutes(app);
  }
});
