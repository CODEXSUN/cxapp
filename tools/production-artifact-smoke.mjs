#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const serverFile = resolve(root, "dist/apps/platform/api/server.js");
const port = 17110;

assert.ok(existsSync(serverFile), "Build CXApp before running the production artifact smoke test.");

const productionResolver = resolve(root, "tools/register-production-package-resolution.mjs");
const child = spawn(
  process.execPath,
  ["--import", pathToFileURL(productionResolver).href, serverFile],
  {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PLATFORM_API_PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);
let output = "";
child.stdout.setEncoding("utf8").on("data", (chunk) => (output += chunk));
child.stderr.setEncoding("utf8").on("data", (chunk) => (output += chunk));

try {
  const health = await waitForHealth();
  const addons = health.data?.checks?.["platform-api"]?.details?.addons ?? [];
  assert.ok(addons.some((addon) => addon.key === "codexsun.blog" && addon.version === "1.0.16"));
  assert.ok(
    addons.some((addon) => addon.key === "codexsun.file-manager" && addon.version === "1.1.5")
  );
  console.log("Production API artifact smoke passed", { addons, port });
} finally {
  child.kill("SIGTERM");
  await Promise.race([onceExit(), delay(5_000)]);
}

async function waitForHealth() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production API exited before readiness.\n${output}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return response.json();
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Production API did not become ready.\n${output}`);
}

function onceExit() {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolveExit) => child.once("exit", resolveExit));
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
