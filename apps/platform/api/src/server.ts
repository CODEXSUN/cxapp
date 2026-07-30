import { registerGracefulShutdown, startApiServer } from "@codexsun/framework/api";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { verifyStartupConnectivity } from "./startup-smoke.js";

await verifyStartupConnectivity();
const app = await createApp();
registerGracefulShutdown(app);
await startApiServer({
  app,
  host: env.PLATFORM_API_HOST,
  port: env.PLATFORM_API_PORT,
  readyLabel: "  ok api ready: {address}"
});
