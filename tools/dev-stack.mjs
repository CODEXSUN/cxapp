#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const services = {
  "platform-api": {
    color: "\x1b[36m",
    healthUrl: "http://127.0.0.1:7010/health",
    label: "api",
    readyTimeoutMs: 90_000
  },
  "platform-web": {
    color: "\x1b[32m",
    healthUrl: "http://127.0.0.1:7020/",
    label: "web",
    readyTimeoutMs: 30_000
  }
};
const reset = "\x1b[0m";
const runtimes = new Map(
  Object.keys(services).map((serviceName) => [
    serviceName,
    {
      child: null,
      failures: 0,
      restartHistory: [],
      restarting: false
    }
  ])
);
let healthTimer;
let stopping = false;

console.log("\nCXApp Platform development runtime");

try {
  await startAndWait("platform-api");
  await startAndWait("platform-web");
  console.log("  ok Platform API and Web are ready");
  console.log("  - API and Web restart independently after local changes or failures\n");
  monitorStackHealth();
} catch (error) {
  console.error(`  x ${errorMessage(error)}`);
  await shutdown(1);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void shutdown(0));
}

async function startAndWait(serviceName) {
  launchService(serviceName);
  const service = services[serviceName];
  console.log(`  - Waiting for ${service.label}`);
  await waitForHealthyUrl(service.healthUrl, service.label, service.readyTimeoutMs);
  runtimes.get(serviceName).failures = 0;
}

function launchService(serviceName) {
  const service = services[serviceName];
  const runtime = runtimes.get(serviceName);
  const child = spawn(process.execPath, ["tools/preflight.mjs", serviceName], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });

  runtime.child = child;
  child.stdout.on("data", (chunk) => writeServiceLines(service, chunk));
  child.stderr.on("data", (chunk) => writeServiceLines(service, chunk));
  child.on("exit", (code, signal) => {
    if (runtime.child !== child) return;
    runtime.child = null;
    if (stopping || runtime.restarting) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(`${service.color}[${service.label}]${reset} exited with ${reason}`);
    void restartService(serviceName, "process exit");
  });
}

async function restartService(serviceName, reason) {
  const runtime = runtimes.get(serviceName);
  const service = services[serviceName];
  if (stopping || runtime.restarting) return;

  runtime.restarting = true;
  runtime.restartHistory = recentRestarts(runtime.restartHistory);
  if (runtime.restartHistory.length >= 5) {
    console.error(
      `${service.color}[${service.label}]${reset} stopped after five restart attempts in 30 seconds`
    );
    await shutdown(1);
    return;
  }
  runtime.restartHistory.push(Date.now());

  try {
    console.log(`${service.color}[${service.label}]${reset} restarting after ${reason}`);
    await stopServiceChild(runtime.child);
    if (stopping) return;
    await wait(500);
    launchService(serviceName);
    await waitForHealthyUrl(service.healthUrl, service.label, service.readyTimeoutMs);
    runtime.failures = 0;
    console.log(`${service.color}[${service.label}]${reset} restart complete`);
  } catch (error) {
    console.error(
      `${service.color}[${service.label}]${reset} restart failed: ${errorMessage(error)}`
    );
    runtime.restarting = false;
    if (!stopping) void restartService(serviceName, "failed restart");
    return;
  }

  runtime.restarting = false;
}

async function waitForHealthyUrl(url, label, timeoutMs) {
  const startedAt = Date.now();
  let lastStatus = "not reachable";

  while (!stopping && Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) return;
    } catch (error) {
      lastStatus = errorMessage(error);
    }

    await wait(500);
  }

  throw new Error(`${label} did not become healthy: ${lastStatus}`);
}

function monitorStackHealth() {
  let checking = false;
  healthTimer = setInterval(async () => {
    if (checking || stopping) return;
    checking = true;

    try {
      for (const [serviceName, service] of Object.entries(services)) {
        const runtime = runtimes.get(serviceName);
        if (runtime.restarting) continue;

        try {
          const response = await fetch(service.healthUrl, {
            signal: AbortSignal.timeout(2_000)
          });
          runtime.failures = response.ok ? 0 : runtime.failures + 1;
        } catch {
          runtime.failures += 1;
        }

        if (runtime.failures >= 3) {
          runtime.failures = 0;
          void restartService(serviceName, "failed health checks");
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

async function shutdown(exitCode) {
  if (stopping) return;
  stopping = true;
  if (healthTimer) clearInterval(healthTimer);
  await Promise.all(Array.from(runtimes.values(), (runtime) => stopServiceChild(runtime.child)));
  process.exit(exitCode);
}

async function stopServiceChild(child) {
  if (!child || child.exitCode !== null || !child.pid) return;

  const exited = waitForExit(child, 3_000);
  if (child.connected) child.send({ type: "cxapp:shutdown" });
  else child.kill("SIGTERM");
  if (await exited) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGKILL");
  }
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolveWait) => {
    if (child.exitCode !== null) {
      resolveWait(true);
      return;
    }
    const timer = setTimeout(() => resolveWait(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveWait(true);
    });
  });
}

function recentRestarts(history) {
  const threshold = Date.now() - 30_000;
  return history.filter((startedAt) => startedAt >= threshold);
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
