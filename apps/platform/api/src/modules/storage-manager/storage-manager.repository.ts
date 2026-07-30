import { createHash, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { sql } from "kysely";
import { getPlatformDatabase } from "../../database/platform-database.js";
import { TenantRepository } from "../tenant/tenant.repository.js";
import {
  appPrivateStorageRoot,
  appPublicStorageRoot,
  appStorageRoot,
  ensureAppStorage,
  ensureTenantStorage,
  normalizeStorageRelativePath,
  resolveInsideStorage,
  storageBase,
  tenantPrivateStorageRoot,
  tenantPublicStorageRoot,
  tenantStorageRoot
} from "./storage-manager.paths.js";
import type {
  CompanyLogoUploadPayload,
  StorageDownloadInput,
  StorageEntry,
  StorageFolderPayload,
  StorageListing,
  StorageListInput,
  StorageUploadPayload
} from "./storage-manager.types.js";

export class StorageManagerRepository {
  constructor(private readonly tenants = new TenantRepository()) {}

  async roots() {
    const app = await ensureAppStorage();
    const tenants = await this.tenants.list();
    const tenantRoots = [];
    for (const tenant of tenants) {
      const tenantKey = tenant.slug || tenant.tenantCode;
      const roots = await ensureTenantStorage(tenantKey);
      await this.updateTenantStorageRoots(tenant.id, roots);
      tenantRoots.push({
        ...roots,
        tenantCode: tenant.tenantCode,
        tenantId: tenant.id,
        tenantName: tenant.tenantName
      });
    }
    return {
      app: {
        privateRoot: appPrivateStorageRoot(),
        publicRoot: appPublicStorageRoot(),
        root: appStorageRoot()
      },
      publicLink: app.symlink,
      tenants: tenantRoots
    };
  }

  async list(input: StorageListInput): Promise<StorageListing> {
    const context = await this.context(input);
    await mkdir(context.base, { recursive: true });
    const folderPath = resolveInsideStorage(context.base, input.path);
    const entries = await readdir(folderPath, { withFileTypes: true });
    const mapped: StorageEntry[] = [];
    for (const entry of entries) {
      const absolute = join(folderPath, entry.name);
      const info = await stat(absolute);
      const relativePath = normalizeStorageRelativePath(join(context.currentPath, entry.name));
      mapped.push({
        extension: entry.isDirectory() ? "" : extname(entry.name).replace(".", ""),
        modifiedAt: info.mtime.toISOString(),
        name: entry.name,
        path: relativePath,
        sizeBytes: entry.isDirectory() ? 0 : info.size,
        type: entry.isDirectory() ? "folder" : "file",
        visibility: context.visibility
      });
    }
    mapped.sort((left, right) =>
      left.type === right.type
        ? left.name.localeCompare(right.name)
        : left.type === "folder"
          ? -1
          : 1
    );
    return {
      currentPath: context.currentPath,
      entries: mapped,
      root: context.base,
      scope: context.scope,
      tenantId: context.tenantId,
      visibility: context.visibility
    };
  }

  async createFolder(input: StorageFolderPayload) {
    const context = await this.context(input);
    const folderPath = resolveInsideStorage(context.base, join(input.path ?? "", input.name));
    await mkdir(folderPath, { recursive: true });
    await this.recordObject({
      diskPath: folderPath,
      objectType: "folder",
      relativePath: normalizeStorageRelativePath(join(context.currentPath, input.name)),
      scope: context.scope,
      sizeBytes: 0,
      tenantId: context.tenantId,
      visibility: context.visibility
    });
    return this.list({ ...input, path: context.currentPath });
  }

  async upload(input: StorageUploadPayload) {
    const context = await this.context(input);
    const fileName = sanitizeFileName(input.fileName);
    const relativePath = normalizeStorageRelativePath(join(context.currentPath, fileName));
    const filePath = resolveInsideStorage(context.base, relativePath);
    await mkdir(resolveInsideStorage(context.base, context.currentPath), { recursive: true });
    const buffer = Buffer.from(input.contentBase64, "base64");
    await writeFile(filePath, buffer);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    await this.recordObject({
      checksum,
      diskPath: filePath,
      mimeType: input.mimeType || null,
      objectType: "file",
      relativePath,
      scope: context.scope,
      sizeBytes: buffer.byteLength,
      tenantId: context.tenantId,
      visibility: context.visibility
    });
    return this.list({ ...input, path: context.currentPath });
  }

  async uploadCompanyLogo(tenantId: string, input: CompanyLogoUploadPayload) {
    const tenant = await this.tenants.findByIdOrCode(tenantId);
    if (!tenant) throw new Error("Tenant was not found for storage.");

    const tenantKey = tenant.slug || tenant.tenantCode;
    const fileName = input.variant === "logo-dark" ? "logo-dark.svg" : "logo.svg";
    const relativePath = `logo/${fileName}`;
    const base = tenantPublicStorageRoot(tenantKey);
    const filePath = resolveInsideStorage(base, relativePath);
    const buffer = Buffer.from(input.contentBase64, "base64");

    if (!isSafeSvg(buffer)) {
      throw new Error("Company logos must be safe SVG files without scripts or external content.");
    }
    if (buffer.byteLength > 640 * 1024) {
      throw new Error("Company logos must be 640 KB or smaller.");
    }

    await mkdir(resolveInsideStorage(base, "logo"), { recursive: true });
    await writeFile(filePath, buffer);
    await this.recordObject({
      checksum: createHash("sha256").update(buffer).digest("hex"),
      diskPath: filePath,
      mimeType: "image/svg+xml",
      objectType: "file",
      relativePath,
      scope: "tenant",
      sizeBytes: buffer.byteLength,
      tenantId: tenant.id,
      visibility: "public"
    });

    return { path: `storage/${tenantKey}/public/${relativePath}`, variant: input.variant };
  }

  async readCompanyLogo(tenantId: string, variant: "logo" | "logo-dark") {
    const tenant = await this.tenants.findByIdOrCode(tenantId);
    if (!tenant) throw new Error("Tenant was not found for storage.");

    const tenantKey = tenant.slug || tenant.tenantCode;
    const fileName = variant === "logo-dark" ? "logo-dark.svg" : "logo.svg";
    const filePath = resolveInsideStorage(tenantPublicStorageRoot(tenantKey), `logo/${fileName}`);
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Company logo was not found.");
    return {
      buffer: await readFile(filePath),
      fileName,
      mimeType: "image/svg+xml",
      sizeBytes: info.size
    };
  }

  async download(input: StorageDownloadInput) {
    const context = await this.context(input);
    const relativePath = normalizeStorageRelativePath(join(input.path ?? "", input.file));
    const filePath = resolveInsideStorage(context.base, relativePath);
    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new Error("Storage download target is not a file.");
    }
    return {
      buffer: await readFile(filePath),
      fileName: filePath.split(/[\\/]/).pop() || "download",
      mimeType: mimeTypeFor(filePath),
      sizeBytes: info.size
    };
  }

  async updateTenantStorageRoots(
    tenantId: number,
    roots: { privateRoot: string; publicRoot: string; root: string }
  ) {
    await getPlatformDatabase()
      .updateTable("tenants")
      .set({
        storage_private_root: roots.privateRoot,
        storage_public_root: roots.publicRoot,
        storage_root: roots.root
      })
      .where("id", "=", tenantId)
      .execute();
  }

  private async context(input: StorageListInput) {
    const scope: "app" | "tenant" = input.scope === "tenant" ? "tenant" : "app";
    const visibility: "private" | "public" = input.visibility === "private" ? "private" : "public";
    let tenantId: number | null = null;
    let tenantKey = input.tenantKey;

    if (scope === "tenant") {
      const tenant = await this.tenants.findByIdOrCode(
        String(input.tenantId || input.tenantKey || "")
      );
      if (!tenant) {
        throw new Error("Tenant was not found for storage.");
      }
      tenantId = tenant.id;
      tenantKey = tenant.slug || tenant.tenantCode;
      await ensureTenantStorage(tenantKey);
      await this.updateTenantStorageRoots(tenant.id, {
        privateRoot: tenantPrivateStorageRoot(tenantKey),
        publicRoot: tenantPublicStorageRoot(tenantKey),
        root: tenantStorageRoot(tenantKey)
      });
    } else {
      await ensureAppStorage();
    }

    return {
      base: storageBase({ scope, visibility, ...(tenantKey ? { tenantKey } : {}) }),
      currentPath: normalizeStorageRelativePath(input.path),
      scope,
      tenantId,
      visibility
    };
  }

  private async recordObject(input: {
    checksum?: string | null;
    diskPath: string;
    mimeType?: string | null;
    objectType: "file" | "folder";
    relativePath: string;
    scope: "app" | "tenant";
    sizeBytes: number;
    tenantId: number | null;
    visibility: "private" | "public";
  }) {
    await getPlatformDatabase()
      .insertInto("storage_objects")
      .values({
        checksum: input.checksum ?? null,
        disk_path: input.diskPath,
        mime_type: input.mimeType ?? null,
        object_type: input.objectType,
        relative_path: input.relativePath,
        scope: input.scope,
        size_bytes: input.sizeBytes,
        tenant_id: input.tenantId ?? 0,
        uuid: randomBytes(4).toString("hex"),
        visibility: input.visibility
      })
      .onDuplicateKeyUpdate({
        checksum: input.checksum ?? null,
        disk_path: input.diskPath,
        mime_type: input.mimeType ?? null,
        object_type: input.objectType,
        size_bytes: input.sizeBytes,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .execute();
  }
}

function sanitizeFileName(value: string) {
  const fileName = value
    .trim()
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!fileName || fileName === "." || fileName === "..") {
    throw new Error("A readable file name is required.");
  }
  return fileName.slice(0, 160);
}

function isSafeSvg(buffer: Buffer) {
  const source = buffer.toString("utf8").trim();
  const hasSvg = source.startsWith("<?xml")
    ? /<svg[\s>]/i.test(source)
    : /^<svg[\s>]/i.test(source);
  return (
    hasSvg &&
    !/<script[\s>]/i.test(source) &&
    !/<foreignObject[\s>]/i.test(source) &&
    !/\son[a-z]+\s*=/i.test(source) &&
    !/javascript\s*:/i.test(source) &&
    !/(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(source)
  );
}

function mimeTypeFor(filePath: string) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".sql" || extension === ".txt" || extension === ".log")
    return "text/plain; charset=utf-8";
  if (extension === ".json") return "application/json";
  return "application/octet-stream";
}
