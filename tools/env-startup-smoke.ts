import { verifyStartupConnectivity } from "../apps/platform/api/src/startup-smoke.js";

await verifyStartupConnectivity();
console.info("Environment contract and startup connectivity passed.");
