import { registerGracefulShutdown, startApiServer } from "@cxapp/framework/api";
import { createApp } from "./app.js";
import { env, platformRuntime } from "./env.js";
import { verifyStartupConnectivity } from "./startup-smoke.js";

await verifyStartupConnectivity();
const app = await createApp();
registerGracefulShutdown(app);
await startApiServer({
  app,
  host: platformRuntime.apiBindHost,
  port: env.PLATFORM_API_PORT,
  readyLabel: "  ok api ready: {address}"
});
