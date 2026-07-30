export { appRegistryModule } from "./app-registry.module.js";
export {
  defaultTenantModuleKeys,
  platformAppRegistry,
  resolveEnabledApps,
  resolveLandingApp
} from "./app-registry.service.js";
export type {
  PlatformAppDefinition,
  PlatformAppId,
  PlatformAppSavePayload
} from "./app-registry.types.js";
