import { existsSync } from "node:fs";
import { lstat, mkdir, symlink } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { env } from "../../env.js";

export type StorageScope = "app" | "tenant";
export type StorageVisibility = "private" | "public";

export type StorageLocation = {
  scope: StorageScope;
  tenantKey?: string;
  visibility: StorageVisibility;
};

export function workspaceRoot() {
  let current = process.cwd();
  for (let index = 0; index < 8; index += 1) {
    if (
      existsSync(join(current, "apps", "platform", "api")) &&
      existsSync(join(current, "package.json"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export function appStorageRoot() {
  return resolve(workspaceRoot(), env.STORAGE_ROOT || "storage/app");
}

export function appPublicStorageRoot() {
  return join(appStorageRoot(), "public");
}

export function appPrivateStorageRoot() {
  return join(appStorageRoot(), "private");
}

export function tenantStorageRoot(tenantKey: string) {
  return resolve(workspaceRoot(), "storage", sanitizeStorageSegment(tenantKey));
}

export function tenantPublicStorageRoot(tenantKey: string) {
  return join(tenantStorageRoot(tenantKey), "public");
}

export function tenantPrivateStorageRoot(tenantKey: string) {
  return join(tenantStorageRoot(tenantKey), "private");
}

export function storageBase(input: StorageLocation) {
  if (input.scope === "app") {
    return input.visibility === "public" ? appPublicStorageRoot() : appPrivateStorageRoot();
  }
  if (!input.tenantKey) {
    throw new Error("Tenant storage requires a tenant key.");
  }
  return input.visibility === "public"
    ? tenantPublicStorageRoot(input.tenantKey)
    : tenantPrivateStorageRoot(input.tenantKey);
}

export function resolveInsideStorage(basePath: string, relativePath = "") {
  const base = resolve(basePath);
  const target = resolve(base, normalizeStorageRelativePath(relativePath) || ".");
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw new Error("Storage path cannot leave its assigned root.");
  }
  return target;
}

export function normalizeStorageRelativePath(value = "") {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..")
    .join("/");
}

export function sanitizeStorageSegment(value: string) {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!segment) {
    throw new Error("Storage segment cannot be empty.");
  }
  return segment.slice(0, 96);
}

export function storageDateFolder(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function storageShortTimestamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
}

export function publicRelativePath(absolutePath: string) {
  return normalizeStorageRelativePath(relative(appPublicStorageRoot(), absolutePath));
}

export async function ensureAppStorage() {
  await mkdir(join(appPublicStorageRoot(), "images"), { recursive: true });
  await mkdir(join(appPrivateStorageRoot(), "database"), { recursive: true });
  return {
    privateRoot: appPrivateStorageRoot(),
    publicRoot: appPublicStorageRoot(),
    root: appStorageRoot(),
    symlink: await ensurePublicStorageLink()
  };
}

export async function ensureTenantStorage(tenantKey: string) {
  await mkdir(join(tenantPublicStorageRoot(tenantKey), "logo"), { recursive: true });
  await mkdir(join(tenantPublicStorageRoot(tenantKey), "images"), { recursive: true });
  await mkdir(join(tenantPrivateStorageRoot(tenantKey), "database"), { recursive: true });
  return {
    privateRoot: tenantPrivateStorageRoot(tenantKey),
    publicRoot: tenantPublicStorageRoot(tenantKey),
    root: tenantStorageRoot(tenantKey)
  };
}

export async function ensurePublicStorageLink() {
  const source = appPublicStorageRoot();
  const link = resolve(workspaceRoot(), "apps", "platform", "web", "public", "storage");
  await mkdir(dirname(link), { recursive: true });
  try {
    const existing = await lstat(link);
    return {
      link,
      source,
      status: existing.isSymbolicLink() ? "linked" : "existing"
    };
  } catch {
    try {
      await symlink(source, link, process.platform === "win32" ? "junction" : "dir");
      return { link, source, status: "created" };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to create public storage link.",
        link,
        source,
        status: "failed"
      };
    }
  }
}

export function databaseBackupPath(input: {
  databaseName: string;
  runId: number;
  scope: "master" | "tenant";
  tenantKey?: string;
}) {
  const now = new Date();
  const dateFolder = storageDateFolder(now);
  const timestamp = storageShortTimestamp(now);
  if (input.scope === "tenant") {
    const tenantKey = sanitizeStorageSegment(input.tenantKey || input.databaseName);
    const fileName = `${tenantKey}_db-${timestamp}-run-${input.runId}.sql`;
    return {
      backupId: `${tenantKey}_db-${timestamp}-run-${input.runId}`,
      filePath: join(tenantPrivateStorageRoot(tenantKey), "database", dateFolder, fileName)
    };
  }

  const databaseName = sanitizeStorageSegment(input.databaseName);
  const fileName = `master-${databaseName}-${timestamp}-run-${input.runId}.sql`;
  return {
    backupId: `master-${databaseName}-${timestamp}-run-${input.runId}`,
    filePath: join(appPrivateStorageRoot(), "database", dateFolder, fileName)
  };
}
