import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerCredentialRecoveryRoutes } from "./credential-recovery.routes.js";

export const credentialRecoveryModule = defineModule<PlatformModuleDependencies>({
  key: "platform.credential-recovery",
  label: "Credential Recovery",
  register({ app }) {
    return registerCredentialRecoveryRoutes(app);
  }
});
