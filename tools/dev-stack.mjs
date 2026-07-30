#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const services = {
  "platform-api": { color: "\x1b[36m", label: "api", preflight: "platform-api" },
  "platform-web": { color: "\x1b[32m", label: "web", preflight: "platform-web" }
};
const reset = "\x1b[0m";
const children = new Set();
let stopping = false;

console.log("\nCODEXSUN Platform runtime");
await startStack();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopChildren();
    process.exit(0);
  });
}

function startService(serviceName) {
  const service = services[serviceName];
  const child = spawn(process.execPath, ["tools/preflight.mjs", service.preflight], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.add(child);
  child.stdout.on("data", (chunk) => writeServiceLines(service, chunk));
  child.stderr.on("data", (chunk) => writeServiceLines(service, chunk));
  child.on("exit", (code) => {
    children.delete(child);
    if (stopping) return;

    const exitCode = code ?? 1;
    console.error(`${service.color}[${service.label}]${reset} exited with code ${exitCode}`);
    stopChildren(child);
    process.exit(exitCode || 1);
  });

  return child;
}

async function startStack() {
  console.log(`  - ${services["platform-api"].label}`);
  startService("platform-api");
  await waitForHealthyUrl("http://127.0.0.1:7010/health", "Platform API", 90_000);

  console.log(`  - ${services["platform-web"].label}`);
  startService("platform-web");
  await waitForHealthyUrl("http://127.0.0.1:7020/", "Platform Web", 30_000);
  console.log("  ok Platform API and Web are ready\n");
  monitorStackHealth();
}

async function waitForHealthyUrl(url, label, timeoutMs) {
  const startedAt = Date.now();
  let lastStatus = "not reachable";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  console.error(`  x ${label} did not become healthy: ${lastStatus}`);
  stopChildren();
  process.exit(1);
}

function monitorStackHealth() {
  const targets = [
    { failures: 0, label: "Platform API", url: "http://127.0.0.1:7010/health" },
    { failures: 0, label: "Platform Web", url: "http://127.0.0.1:7020/" }
  ];
  let checking = false;

  setInterval(async () => {
    if (checking || stopping) return;
    checking = true;

    try {
      for (const target of targets) {
        try {
          const response = await fetch(target.url, { signal: AbortSignal.timeout(2_000) });
          target.failures = response.ok ? 0 : target.failures + 1;
        } catch {
          target.failures += 1;
        }

        if (target.failures >= 3) {
          console.error(`  x ${target.label} became unavailable; stopping Platform runtime`);
          stopChildren();
          process.exit(1);
        }
      }
    } finally {
      checking = false;
    }
  }, 2_000);
}

function writeServiceLines(service, chunk) {
  for (const rawLine of String(chunk).split(/\r?\n/u)) {
    const line = rawLine.replace(/\u001b\[[0-9;]*m/gu, "").trim();
    if (line) process.stdout.write(`${service.color}[${service.label}]${reset} ${line}\n`);
  }
}

function stopChildren(skipChild) {
  stopping = true;
  for (const child of children) {
    if (child === skipChild || child.killed || !child.pid) continue;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
}
