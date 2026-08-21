#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const app = process.argv[2];

const apps = {
  "platform-api": {
    displayName: "api",
    cwd: "apps/platform/api",
    envKey: "PLATFORM_API_PORT",
    host: "127.0.0.1",
    command: process.execPath,
    args: [
      "--watch",
      "--watch-path=src",
      "--watch-path=../../../.env",
      "--import",
      pathToFileURL(resolve(root, "tools/register-root-package-resolution.mjs")).href,
      "--import",
      "tsx",
      "src/server.ts"
    ]
  },
  "platform-web": {
    displayName: "web",
    cwd: "apps/platform/web",
    envKey: "PLATFORM_WEB_PORT",
    host: "127.0.0.1",
    command: process.execPath,
    args: [nodePackageBin("vite", "bin/vite.js"), "--strictPort"]
  }
};

if (!app || !apps[app]) {
  console.log(`Usage: node tools/preflight.mjs <${Object.keys(apps).join("|")}>`);
  process.exit(1);
}

const config = apps[app];
const env = loadDotEnv();
const port = parseRequiredPort(env[config.envKey], config.envKey);
const host = config.host;

if (app === "platform-web") {
  await waitForPlatformApi(parseRequiredPort(env.PLATFORM_API_PORT, "PLATFORM_API_PORT"));
}

await freePort(port, host);

if (app === "platform-api") {
  ensurePlatformApiDependencies();
  provisionFileManagerDatabase();
}

const child = spawn(
  config.command,
  [...config.args, ...(app.endsWith("-web") ? ["--host", host, "--port", String(port)] : [])],
  {
    cwd: resolve(root, config.cwd),
    env: {
      ...process.env,
      // The API loads the root .env itself. Keeping those values out of the long-lived
      // watcher lets a child restart read fresh integration credentials after .env changes.
      ...(app === "platform-web" ? env : {}),
      ...(app === "platform-api"
        ? {
            CXAPP_DB_FRESH_SESSION_FILE: join(tmpdir(), `cxapp-platform-fresh-${process.pid}.done`)
          }
        : {}),
      [config.envKey]: String(port)
    },
    stdio: "inherit"
  }
);

child.on("exit", (code) => process.exit(code ?? 0));

process.on("message", (message) => {
  if (message?.type === "cxapp:shutdown") {
    stopChild(child, "SIGTERM");
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopChild(child, signal);
  });
}

function loadDotEnv() {
  const envPath = resolve(root, ".env");

  if (!existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])])
  );
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed.replace(/\s+#.*$/, "").trim();
}

function parseRequiredPort(value, envKey) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    console.error(`  x Missing required port configuration: ${envKey}`);
    process.exit(1);
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    console.error(`  x Invalid port configuration for ${envKey}: ${raw}`);
    process.exit(1);
  }

  return port;
}

function ensurePlatformApiDependencies() {
  console.log("  - Checking API package builds");
  ensureWorkspacePackageBuild("@cxapp/framework", "packages/framework");
}

function provisionFileManagerDatabase() {
  console.log("  - Checking File Manager database access");
  execFileSync(process.execPath, [resolve(root, "tools/provision-file-manager-db.mjs")], {
    cwd: root,
    stdio: "inherit"
  });
}

function ensureWorkspacePackageBuild(workspaceName, packagePath) {
  const absolutePackagePath = resolve(root, packagePath);
  const srcPath = join(absolutePackagePath, "src");
  const distPath = resolve(root, "dist", packagePath);
  const packageJsonPath = join(absolutePackagePath, "package.json");
  const tsconfigPath = join(absolutePackagePath, "tsconfig.json");

  if (!existsSync(distPath)) {
    buildWorkspacePackage(workspaceName, "dist missing");
    return;
  }

  const sourceTime = newestMtime([srcPath, packageJsonPath, tsconfigPath]);
  const distTime = newestMtime([distPath]);

  if (sourceTime > distTime) {
    buildWorkspacePackage(workspaceName, "source changed");
    return;
  }

  console.log(`  ok ${workspaceName} build is current`);
}

function buildWorkspacePackage(workspaceName, reason) {
  const startedAt = Date.now();
  console.log(`  build ${workspaceName} (${reason})`);
  runNpm(["run", "build", "-w", workspaceName]);
  console.log(`  ok ${workspaceName} built in ${Date.now() - startedAt}ms`);
}

function newestMtime(paths) {
  let newest = 0;
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }
    const stat = statSync(path);
    newest = Math.max(newest, stat.mtimeMs);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".turbo" || entry.name === "dist") {
          continue;
        }
        newest = Math.max(newest, newestMtime([join(path, entry.name)]));
      }
    }
  }
  return newest;
}

function runNpm(args) {
  if (process.env.npm_execpath) {
    execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
      cwd: root,
      stdio: "inherit"
    });
    return;
  }

  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", ["npm", ...args].join(" ")], {
      cwd: root,
      stdio: "inherit"
    });
    return;
  }

  execFileSync("npm", args, {
    cwd: root,
    stdio: "inherit"
  });
}

async function freePort(port, host) {
  console.log(`\n  > ${config.displayName} preflight`);
  console.log(`  - Checking ${host}:${port}`);

  if (await probePort(port, host)) {
    await waitForPortRelease();
    console.log(`  ok ${host}:${port} is ready\n`);
    return;
  }

  const pids = getPidsOnPort(port);

  if (!pids.length) {
    console.log(`  ok Port ${port} is ready (no blocking process found)\n`);
    return;
  }

  console.log(`  ! ${host}:${port} is already in use by PID ${pids.join(", ")}`);

  if (process.env.CXAPP_DEV_PORT_POLICY === "abort") {
    console.error(
      "  x Port policy is abort. Stop the existing process or change CXAPP_DEV_PORT_POLICY.\n"
    );
    process.exit(1);
  }

  for (const pid of pids) {
    killPid(pid);
    console.log(`  ok Stopped PID ${pid}`);
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await probePort(port, host)) {
      await waitForPortRelease();
      console.log(`  ok ${host}:${port} is ready\n`);
      return;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }

  console.error(`  x Port ${port} was not released after stopping PID ${pids.join(", ")}.\n`);
  process.exit(1);
}

function probePort(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close((error) => resolve(!error));
    });
    server.listen(port, host);
  });
}

function waitForPortRelease() {
  return new Promise((resolveWait) => setTimeout(resolveWait, 100));
}

async function waitForPlatformApi(apiPort) {
  const healthUrl = `http://127.0.0.1:${apiPort}/health`;
  const startedAt = Date.now();
  let lastStatus = "not reachable";

  console.log(`\n  - Waiting for Platform API at ${healthUrl}`);
  while (Date.now() - startedAt < 90_000) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) {
        console.log("  ok Platform API is ready");
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  console.error(`  x Platform API did not become healthy: ${lastStatus}`);
  console.error("  x Start it separately with: npm run dev:api\n");
  process.exit(1);
}

function getPidsOnPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("netstat", ["-ano", "-p", "tcp"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });

      return Array.from(
        new Set(
          out
            .split(/\r?\n/)
            .map((line) => line.trim().split(/\s+/))
            .filter(
              (parts) =>
                parts.length >= 5 && parts[3] === "LISTENING" && portFromAddress(parts[1]) === port
            )
            .map((parts) => Number(parts[4]))
            .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
        )
      );
    }

    const out = execFileSync("lsof", ["-ti", `:${port}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return Array.from(
      new Set(
        out
          .split(/\s+/)
          .map(Number)
          .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
      )
    );
  } catch {
    return [];
  }
}

function portFromAddress(address) {
  const match = String(address).match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function killPid(pid) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

function stopChild(childProcess, signal) {
  if (childProcess.killed || !childProcess.pid) {
    return;
  }

  childProcess.kill(signal);

  const forceTimer = setTimeout(() => {
    if (childProcess.exitCode !== null || !childProcess.pid) return;
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(childProcess.pid), "/T", "/F"], {
          stdio: ["ignore", "pipe", "pipe"]
        });
      } catch {}
      return;
    }
    childProcess.kill("SIGKILL");
  }, 3_000);
  forceTimer.unref();
}

function nodePackageBin(packageName, binPath) {
  return resolve(root, "node_modules", packageName, binPath);
}
