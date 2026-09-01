import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { AddonHostRegistry, type AddonManifest } from "@cxapp/framework/addons";
import { runMigrationBatch } from "@cxapp/framework/db";
import { AppError } from "@cxapp/framework/errors";
import { blogPluginManifest } from "@codexsun/blog/contracts";
import { fileManagerPluginManifest } from "@codexsun/file-manager/contracts";
import { tenantAccessContext } from "./auth/tenant-access-context.js";
import { env } from "./env.js";
import { TenantService } from "./modules/tenant/tenant.service.js";
import { getTenantDatabase } from "./database/tenant-database.js";
import { withInstalledAddonVersion } from "./addon-package.js";

type BlogPackage = {
  blogsApiModuleKeys: readonly string[];
  closeBlogsDatabase?: () => Promise<void>;
  provisionBlogsDatabase?: (input: {
    context: BlogContext;
    runMigrationBatch: typeof runMigrationBatch;
  }) => Promise<void>;
  registerBlogsApi: (
    app: FastifyInstance,
    options?: {
      authorize: (input: { request: FastifyRequest }) => Promise<void>;
      resolveContext: (request: FastifyRequest) => Promise<BlogContext>;
    }
  ) => Promise<void>;
};

type BlogContext = {
  actorId: string | null;
  database: Kysely<Record<string, unknown>>;
  host: "cxapp";
  origin: string;
  scopeId: string;
};

type FileManagerPackage = {
  closeFileManagerDatabase: () => Promise<void>;
  fileManagerApiModuleKeys: readonly string[];
  registerFileManagerApi: (
    app: FastifyInstance,
    options: {
      resolveContext: (request: FastifyRequest) => Promise<FileManagerContext>;
    }
  ) => Promise<void>;
};

type FileManagerContext = {
  actorId: string;
  host: "cxapp";
  tenantId: string;
};

const blog = (await import("@codexsun/blog/api")) as unknown as BlogPackage;
const fileManager = (await import("@codexsun/file-manager/api")) as unknown as FileManagerPackage;
const tenantService = new TenantService();
const provisioning = new Map<string, Promise<void>>();
const registry = new AddonHostRegistry({
  capabilities: [
    "identity",
    "authorization",
    "database",
    "migration-ledger",
    "audit",
    "queue",
    "media.public"
  ],
  runtimeMode: "multi-tenant"
});

export const addonApiModuleKeys = [
  ...blog.blogsApiModuleKeys,
  ...fileManager.fileManagerApiModuleKeys
] as const;

export async function registerPlatformAddons(app: FastifyInstance) {
  try {
    await registry.register({
      activate: () => registerBlog(app),
      ...(blog.closeBlogsDatabase ? { close: blog.closeBlogsDatabase } : {}),
      databaseMode: supportsHostDatabase(blog) ? "host-database" : "dedicated",
      manifest: installedBlogManifest(),
      moduleKeys: blog.blogsApiModuleKeys
    });
    await registry.register({
      activate: () => registerFileManager(app),
      close: fileManager.closeFileManagerDatabase,
      databaseMode: "dedicated",
      manifest: installedFileManagerManifest(),
      moduleKeys: fileManager.fileManagerApiModuleKeys
    });
  } catch (error) {
    await closeAfterActivationFailure(error);
  }
}

async function closeAfterActivationFailure(activationError: unknown): Promise<never> {
  try {
    await registry.close();
  } catch (closeError) {
    throw new AggregateError(
      [activationError, closeError],
      "Add-on activation failed and cleanup was incomplete.",
      { cause: closeError }
    );
  }
  throw activationError;
}

export function activePlatformAddons() {
  return registry.list().map(({ databaseMode, manifest, moduleKeys }) => ({
    databaseMode,
    displayName: manifest.displayName,
    key: manifest.key,
    moduleKeys,
    version: manifest.version
  }));
}

export async function closePlatformAddons() {
  await registry.close();
  provisioning.clear();
}

async function registerBlog(app: FastifyInstance) {
  if (!supportsHostDatabase(blog)) return blog.registerBlogsApi(app);
  return blog.registerBlogsApi(app, {
    authorize: async ({ request }) => {
      await tenantAccessContext(request).authorize("blog.manage");
    },
    resolveContext: resolveBlogContext
  });
}

async function registerFileManager(app: FastifyInstance) {
  await fileManager.registerFileManagerApi(app, {
    resolveContext: async (request) => {
      const access = tenantAccessContext(request);
      return {
        actorId: access.actorEmail,
        host: "cxapp",
        tenantId: access.tenantId
      };
    }
  });
}

async function resolveBlogContext(request: FastifyRequest): Promise<BlogContext> {
  const publicRoute =
    request.url.startsWith("/public/blog") || request.url.startsWith("/sitemap.xml");
  const payload = request.authContext?.payload;
  if (!publicRoute) {
    const access = tenantAccessContext(request);
    const tenant = await tenantService.getTenant(access.tenantId);
    if (!tenant) throw AppError.forbidden("Blog tenant context is unavailable.");
    const context = blogContext(tenant, payload?.userId ?? null, request);
    await ensureBlogProvisioned(tenant.dbName, context);
    return context;
  }

  const host = requestHost(request);
  const { tenant } = await tenantService.getPublicApplicationCompany(host);
  if (!tenant) throw AppError.notFound("A public Blog tenant was not found for this domain.");
  const context = blogContext(tenant, payload?.userId ?? null, request);
  await ensureBlogProvisioned(tenant.dbName, context);
  return context;
}

function blogContext(
  tenant: NonNullable<Awaited<ReturnType<TenantService["getTenant"]>>>,
  actorId: string | null,
  request: FastifyRequest
): BlogContext {
  return {
    actorId,
    database: getTenantDatabase(tenant) as unknown as Kysely<Record<string, unknown>>,
    host: "cxapp",
    origin: requestOrigin(request),
    scopeId: tenant.uuid
  };
}

async function ensureBlogProvisioned(databaseName: string, context: BlogContext) {
  if (!blog.provisionBlogsDatabase) return;
  let pending = provisioning.get(databaseName);
  if (!pending) {
    pending = blog.provisionBlogsDatabase({ context, runMigrationBatch });
    provisioning.set(databaseName, pending);
  }
  try {
    await pending;
  } catch (error) {
    provisioning.delete(databaseName);
    throw error;
  }
}

function requestHost(request: FastifyRequest) {
  const forwarded = request.headers["x-forwarded-host"];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded) ?? request.hostname;
}

function requestOrigin(request: FastifyRequest) {
  const host = requestHost(request);
  const forwarded = request.headers["x-forwarded-proto"];
  const protocol =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded) ??
    (env.NODE_ENV === "production" ? "https" : "http");
  return `${protocol}://${host}`;
}

function supportsHostDatabase(value: BlogPackage): value is Required<BlogPackage> {
  return typeof value.provisionBlogsDatabase === "function";
}

function installedBlogManifest(): AddonManifest {
  return withInstalledAddonVersion(
    "@codexsun/blog",
    "@codexsun/blog/contracts",
    blogPluginManifest
  );
}

function installedFileManagerManifest(): AddonManifest {
  return withInstalledAddonVersion(
    "@codexsun/file-manager",
    "@codexsun/file-manager/contracts",
    fileManagerPluginManifest
  );
}
