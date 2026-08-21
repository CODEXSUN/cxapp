import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  platformWebAllowedHosts,
  requireEnvNumber,
  requireEnvValue,
  resolvePlatformRuntime
} from "@cxapp/framework/env";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const rootPackage = JSON.parse(
  readFileSync(resolve(configDir, "../../../package.json"), "utf8")
) as { version: string };

export default defineConfig(({ command, mode }) => {
  const runtimeEnv = loadEnv(mode, resolve(configDir, "../../.."), "");

  return {
    build: {
      chunkSizeWarningLimit: 900,
      emptyOutDir: true,
      outDir: "../../../dist/apps/platform/web"
    },
    cacheDir: "../../../node_modules/.vite/platform-web",
    envDir: "../../..",
    define: {
      __APP_VERSION__: JSON.stringify(rootPackage.version)
    },
    optimizeDeps: {
      exclude: ["@codexsun/blog/web", "@codexsun/file-manager/web"],
      include: [
        "react-is",
        "use-sync-external-store/shim",
        "use-sync-external-store/shim/index.js",
        "use-sync-external-store/shim/with-selector",
        "use-sync-external-store/shim/with-selector.js"
      ]
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      preserveSymlinks: true
    },
    ...(command === "serve" ? { server: platformDevelopmentServer(runtimeEnv) } : {})
  };
});

function platformDevelopmentServer(runtimeEnv: Record<string, string | undefined>) {
  const platformRuntime = resolvePlatformRuntime({
    NODE_ENV: requireEnvValue(runtimeEnv.NODE_ENV, "NODE_ENV"),
    PLATFORM_API_PORT: requireEnvNumber(runtimeEnv.PLATFORM_API_PORT, "PLATFORM_API_PORT")
  });
  const proxy = {
    changeOrigin: false,
    target: platformRuntime.apiUrl
  };

  return {
    allowedHosts: platformWebAllowedHosts(
      requireEnvValue(runtimeEnv.PLATFORM_WEB_ORIGIN, "PLATFORM_WEB_ORIGIN")
    ),
    headers: {
      "Permissions-Policy": "unload=*"
    },
    host: platformRuntime.webBindHost,
    port: requireEnvNumber(runtimeEnv.PLATFORM_WEB_PORT, "PLATFORM_WEB_PORT"),
    proxy: {
      "/api/billing": {
        ...proxy,
        rewrite: (path: string) => path.replace(/^\/api\/billing/u, "") || "/"
      },
      "/api/core": {
        ...proxy,
        rewrite: (path: string) => path.replace(/^\/api\/core/u, "") || "/"
      },
      "/api/devkit": {
        ...proxy,
        rewrite: (path: string) => `/devkit${path.replace(/^\/api\/devkit/u, "") || "/"}`
      },
      "/api/platform": {
        ...proxy,
        rewrite: (path: string) => path.replace(/^\/api\/platform/u, "") || "/"
      }
    }
  };
}
