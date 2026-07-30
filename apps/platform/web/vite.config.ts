import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { requireEnvNumber, requireEnvValue } from "@codexsun/framework/env";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const rootPackage = JSON.parse(
  readFileSync(resolve(configDir, "../../../package.json"), "utf8")
) as { version: string };

export default defineConfig(({ command, mode }) => {
  const runtimeEnv = {
    ...loadEnv(mode, resolve(configDir, "../../.."), ""),
    ...process.env
  };

  return {
    build: {
      chunkSizeWarningLimit: 900,
      emptyOutDir: true,
      outDir: "../../../dist/apps/platform/web"
    },
    cacheDir: "../../../node_modules/.vite/platform-web",
    envDir: "../../..",
    define: {
      __APP_VERSION__: JSON.stringify(rootPackage.version),
      "import.meta.env.VITE_DEV_AUTO_TENANT_LOGIN": JSON.stringify(
        runtimeEnv.DEV_AUTO_TENANT_LOGIN ?? "0"
      ),
      "import.meta.env.VITE_PLATFORM_API_URL": JSON.stringify("/api/platform"),
      "import.meta.env.VITE_TENANT_NAME": JSON.stringify(
        runtimeEnv.DEFAULT_TENANT_NAME || "Codexsun"
      )
    },
    plugins: [tailwindcss(), react()],
    ...(command === "serve"
      ? {
          server: {
            allowedHosts: [
              "sukraa.codexsun.com",
              "cotton.codexsun.com",
              "ganapathi.codexsun.com"
            ],
            headers: {
              "Permissions-Policy": "unload=*"
            },
            host: "127.0.0.1",
            port: requireEnvNumber(runtimeEnv.PLATFORM_WEB_PORT, "PLATFORM_WEB_PORT"),
            proxy: {
              "/api/billing": {
                changeOrigin: false,
                rewrite: (path) => path.replace(/^\/api\/billing/u, "") || "/",
                target: platformApiTarget(runtimeEnv)
              },
              "/api/core": {
                changeOrigin: false,
                rewrite: (path) => path.replace(/^\/api\/core/u, "") || "/",
                target: platformApiTarget(runtimeEnv)
              },
              "/api/platform": {
                changeOrigin: false,
                rewrite: (path) => path.replace(/^\/api\/platform/u, "") || "/",
                target: platformApiTarget(runtimeEnv)
              }
            }
          }
        }
      : {})
  };
});

function platformApiTarget(runtimeEnv: Record<string, string | undefined>) {
  return requireEnvValue(runtimeEnv.PLATFORM_API_URL, "PLATFORM_API_URL");
}
