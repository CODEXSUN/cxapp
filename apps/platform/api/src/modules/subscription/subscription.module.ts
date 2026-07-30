import { defineModule } from "@codexsun/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerSubscriptionRoutes } from "./subscription.routes.js";
export const subscriptionModule = defineModule<PlatformModuleDependencies>({
  key: "platform.subscription",
  label: "Subscriptions",
  register({ app }) {
    return registerSubscriptionRoutes(app);
  }
});
