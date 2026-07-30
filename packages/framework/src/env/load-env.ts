import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import dotenv from "dotenv";
import type { z } from "zod";

export function loadEnv<TSchema extends z.ZodTypeAny>(schema: TSchema): z.infer<TSchema> {
  const envPath = loadNearestEnvFile();
  if (!envPath && process.env.CODEXSUN_ALLOW_MISSING_ENV !== "1") {
    showMissingEnvBanner();
  }

  const result = schema.safeParse(process.env);
  if (!result.success) {
    showInvalidEnvBanner();
    throw result.error;
  }

  return result.data;
}

function loadNearestEnvFile() {
  const envPath = findNearestEnvFile(process.cwd());

  if (envPath) {
    dotenv.config({ path: envPath, quiet: true });
  }

  return envPath;
}

function findNearestEnvFile(startPath: string) {
  let currentPath = resolve(startPath);
  const rootPath = parse(currentPath).root;

  while (true) {
    const envPath = join(currentPath, ".env");

    if (existsSync(envPath)) {
      return envPath;
    }

    if (isWorkspaceRoot(currentPath) || currentPath === rootPath) {
      return undefined;
    }

    currentPath = dirname(currentPath);
  }
}

function isWorkspaceRoot(path: string) {
  const packageJsonPath = join(path, "package.json");

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      workspaces?: unknown;
    };
    return Array.isArray(packageJson.workspaces);
  } catch {
    return false;
  }
}

function showMissingEnvBanner() {
  console.warn(`
CODEXSUN environment file was not found.

Create one before starting the app:
  Copy-Item .env.example .env
  npm run env:jwt-secret

Then fill DB_MASTER_NAME, DB_USER, DB_PASSWORD, and JWT_SECRET in .env.
Only fill DEFAULT_TENANT_* when ENABLE_DEFAULT_TENANT_SEED=1 for tests.
`);
}

function showInvalidEnvBanner() {
  console.error(`
CODEXSUN environment is incomplete or invalid.

Check .env and make sure database and JWT values are explicitly configured.
Tenant/admin seed values are optional unless their seed flow is enabled.
Start from:
  Copy-Item .env.example .env
  npm run env:jwt-secret
`);
}
