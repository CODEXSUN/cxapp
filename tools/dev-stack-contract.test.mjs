import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  packageSource,
  stackSource,
  preflightSource,
  appRegistrySource,
  appDeskSource,
  platformApiTsconfigSource,
  platformWebTsconfigSource,
  platformWebViteSource
] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("./dev-stack.mjs", import.meta.url), "utf8"),
  readFile(new URL("./preflight.mjs", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/src/app/app-registry.ts", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/src/desks/tenant/AppDesk.tsx", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/api/tsconfig.json", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/tsconfig.json", import.meta.url), "utf8"),
  readFile(new URL("../apps/platform/web/vite.config.ts", import.meta.url), "utf8")
]);
const packageJson = JSON.parse(packageSource);
const platformApiTsconfig = JSON.parse(platformApiTsconfigSource);
const platformWebTsconfig = JSON.parse(platformWebTsconfigSource);

test("development commands keep API and web watchers independently available", () => {
  assert.equal(packageJson.scripts.dev, "node tools/dev-stack.mjs");
  assert.equal(packageJson.scripts["dev:api"], "node tools/preflight.mjs platform-api");
  assert.equal(packageJson.scripts["dev:web"], "node tools/preflight.mjs platform-web");
  assert.match(preflightSource, /"--watch"/u);
  assert.match(preflightSource, /nodePackageBin\("vite", "bin\/vite\.js"\)/u);
});

test("API development resolves linked owner packages through the root dependency tree", () => {
  assert.match(preflightSource, /register-root-package-resolution\.mjs/u);
  assert.match(preflightSource, /"--import",\s*"tsx"/u);
  assert.equal(platformApiTsconfig.compilerOptions.preserveSymlinks, true);
});

test("web development keeps linked owner source and styles on the root dependency path", () => {
  assert.equal(platformWebTsconfig.compilerOptions.preserveSymlinks, true);
  assert.match(platformWebViteSource, /preserveSymlinks:\s*true/u);
  assert.match(platformWebViteSource, /exclude:\s*\["@codexsun\/blog\/web"/u);
  assert.match(platformWebViteSource, /use-sync-external-store\/shim"/u);
  assert.match(platformWebViteSource, /use-sync-external-store\/shim\/index\.js/u);
  assert.match(platformWebViteSource, /use-sync-external-store\/shim\/with-selector/u);
  assert.match(platformWebViteSource, /use-sync-external-store\/shim\/with-selector\.js/u);
});

test("tenant app breadcrumbs use app IDs and canonical root pages", () => {
  assert.match(appRegistrySource, /appId:\s*app\.id/u);
  assert.match(appRegistrySource, /url:\s*appRootUrl\(app\.id\)/u);
  assert.match(appDeskSource, /selectPage\(pageForApp\(item\.appId\)\)/u);
  assert.doesNotMatch(appDeskSource, /item\.title\s*===/u);
});

test("combined development runtime restarts one service without stopping its sibling", () => {
  assert.match(stackSource, /restartService\(serviceName, "process exit"\)/u);
  assert.match(stackSource, /restartService\(serviceName, "failed health checks"\)/u);
  assert.doesNotMatch(stackSource, /stopChildren\(child\)/u);
});

test("development shutdown asks the child to stop before forcing termination", () => {
  const gracefulStop = stackSource.indexOf('child.send({ type: "cxapp:shutdown" })');
  const forcedStop = stackSource.indexOf('spawnSync("taskkill"');
  assert.ok(gracefulStop >= 0, "The supervisor must request a graceful child shutdown.");
  assert.ok(forcedStop > gracefulStop, "Forced termination must remain a fallback.");
  assert.match(preflightSource, /message\?\.type === "cxapp:shutdown"/u);
});
