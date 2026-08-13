import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [packageSource, stackSource, preflightSource] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("./dev-stack.mjs", import.meta.url), "utf8"),
  readFile(new URL("./preflight.mjs", import.meta.url), "utf8")
]);
const packageJson = JSON.parse(packageSource);

test("development commands keep API and web watchers independently available", () => {
  assert.equal(packageJson.scripts.dev, "node tools/dev-stack.mjs");
  assert.equal(packageJson.scripts["dev:api"], "node tools/preflight.mjs platform-api");
  assert.equal(packageJson.scripts["dev:web"], "node tools/preflight.mjs platform-web");
  assert.match(preflightSource, /"watch"/u);
  assert.match(preflightSource, /nodePackageBin\("vite", "bin\/vite\.js"\)/u);
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
