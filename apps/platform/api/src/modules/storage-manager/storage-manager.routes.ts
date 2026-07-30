import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fail, ok } from "@codexsun/framework/http";
import { verifyAuthToken } from "../../auth/jwt.js";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import { StorageManagerService } from "./storage-manager.service.js";
import type {
  CompanyLogoUploadPayload,
  StorageFolderPayload,
  StorageListInput,
  StorageUploadPayload
} from "./storage-manager.types.js";

const service = new StorageManagerService();

export async function registerStorageManagerRoutes(app: FastifyInstance) {
  app.get("/admin/storage/roots", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.roots(), { requestId: request.id })
  );
  app.get("/admin/storage/list", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.list(storageListFromQuery(request.query)), { requestId: request.id })
  );
  app.post("/admin/storage/folders", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.createFolder(request.body as StorageFolderPayload), { requestId: request.id })
  );
  app.post("/admin/storage/upload", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.upload(request.body as StorageUploadPayload), { requestId: request.id })
  );
  app.get("/admin/storage/download", { preHandler: requireSuperAdmin }, async (request, reply) =>
    sendDownload(reply, await service.download(storageDownloadFromQuery(request.query)))
  );

  app.get("/tenant/storage/list", { preHandler: requireTenantUser }, async (request) =>
    ok(await service.list(tenantStorageInput(request, request.query)), { requestId: request.id })
  );
  app.post("/tenant/storage/folders", { preHandler: requireTenantUser }, async (request) =>
    ok(
      await service.createFolder(tenantStorageInput(request, request.body) as StorageFolderPayload),
      { requestId: request.id }
    )
  );
  app.post("/tenant/storage/upload", { preHandler: requireTenantUser }, async (request) =>
    ok(await service.upload(tenantStorageInput(request, request.body) as StorageUploadPayload), {
      requestId: request.id
    })
  );
  app.post("/tenant/media/company-logo", { preHandler: requireTenantUser }, async (request) => {
    const tenantId = String(request.headers["x-tenant-id"] || "");
    return ok(await service.uploadCompanyLogo(tenantId, request.body as CompanyLogoUploadPayload), {
      requestId: request.id
    });
  });
  app.get(
    "/tenant/media/company-logo/:variant",
    { preHandler: requireTenantUser },
    async (request, reply) => {
      const { variant } = request.params as { variant: string };
      if (variant !== "logo" && variant !== "logo-dark") {
        return reply
          .code(404)
          .send(
            fail(
              { code: "COMPANY_LOGO_NOT_FOUND", message: "Company logo was not found." },
              { requestId: request.id }
            )
          );
      }
      const tenantId = String(request.headers["x-tenant-id"] || "");
      const file = await service.readCompanyLogo(tenantId, variant);
      return reply
        .header("cache-control", "no-store")
        .header("content-type", file.mimeType)
        .header("content-length", String(file.sizeBytes))
        .send(file.buffer);
    }
  );
  app.get("/tenant/storage/download", { preHandler: requireTenantUser }, async (request, reply) =>
    sendDownload(
      reply,
      await service.download(
        tenantStorageInput(request, request.query) as ReturnType<typeof storageDownloadFromQuery>
      )
    )
  );
}

async function requireTenantUser(request: FastifyRequest, reply: FastifyReply) {
  const payload = authPayload(request);
  if (payload?.userType === "tenant" && payload.tenantId) {
    request.headers["x-tenant-id"] = payload.tenantId;
    return;
  }
  return reply.code(403).send(
    fail(
      {
        code: "TENANT_STORAGE_REQUIRED",
        message: "Tenant storage access requires a tenant session."
      },
      { requestId: request.id }
    )
  );
}

function authPayload(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  return token ? verifyAuthToken(token) : null;
}

function tenantStorageInput(
  request: FastifyRequest,
  value: unknown
): StorageListInput & { file?: string } {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const input = storageListFromQuery(value);
  return {
    ...raw,
    ...input,
    scope: "tenant",
    tenantId: String(request.headers["x-tenant-id"] || ""),
    visibility: input.visibility === "private" ? "private" : "public",
    ...(typeof raw.file === "string" ? { file: String(raw.file) } : {})
  };
}

function storageListFromQuery(value: unknown): StorageListInput {
  const input =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const scope = input.scope === "tenant" ? "tenant" : "app";
  const visibility = input.visibility === "private" ? "private" : "public";
  return {
    path: typeof input.path === "string" ? input.path : "",
    scope,
    tenantId:
      typeof input.tenantId === "string" || typeof input.tenantId === "number"
        ? input.tenantId
        : null,
    visibility
  };
}

function storageDownloadFromQuery(value: unknown) {
  const input =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    ...storageListFromQuery(value),
    file: typeof input.file === "string" ? input.file : ""
  };
}

function sendDownload(
  reply: FastifyReply,
  file: Awaited<ReturnType<StorageManagerService["download"]>>
) {
  return reply
    .header("content-type", file.mimeType)
    .header("content-length", String(file.sizeBytes))
    .header("content-disposition", `attachment; filename="${file.fileName.replace(/"/g, "")}"`)
    .send(file.buffer);
}
