import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getCompanyForDatabase } from "@cxapp/core-api";
import { AppError } from "@cxapp/framework/errors";
import { fail, ok } from "@cxapp/framework/http";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { TenantService } from "../tenant/tenant.service.js";
import { StorageManagerService } from "./storage-manager.service.js";
import type {
  CompanyLogoUploadPayload,
  StorageFolderPayload,
  StorageListInput,
  StorageUploadPayload
} from "./storage-manager.types.js";

const service = new StorageManagerService();
const tenants = new TenantService();

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
    const context = tenantAccessContext(request);
    const input = companyLogoUpload(request.body);
    await context.authorize("core.application.records.update");
    const company = await getCompanyForDatabase(context.tenantDatabase, input.companyId);
    if (!company) throw AppError.validation("Company was not found for logo storage.");
    return ok(await service.uploadCompanyLogo(context.tenantId, input), { requestId: request.id });
  });
  app.get(
    "/tenant/media/companies/:companyId/company-logo/:variant",
    { preHandler: requireTenantUser },
    async (request, reply) => {
      const context = tenantAccessContext(request);
      await context.authorize("core.application.records.view");
      const { companyId, variant } = companyLogoParams(request.params);
      const company = await getCompanyForDatabase(context.tenantDatabase, companyId);
      if (!company) return companyLogoNotFound(reply, request.id);
      const file = await service.readCompanyLogo(context.tenantId, companyId, variant);
      return file ? sendCompanyLogo(reply, file) : companyLogoNotFound(reply, request.id);
    }
  );
  app.get("/public/app-portal/company-logo/:variant", async (request, reply) => {
    const variant = companyLogoVariant((request.params as { variant?: unknown }).variant);
    const resolved = await tenants.getPublicApplicationCompany(requestHost(request));
    const company = resolved.company;
    const configuredPath = variant === "logo-dark" ? company?.logoDarkPath : company?.logoPath;
    if (!resolved.tenant || !company || !configuredPath) {
      return companyLogoNotFound(reply, request.id);
    }
    const file = await service.readCompanyLogo(resolved.tenant.uuid, company.companyId, variant);
    return file ? sendCompanyLogo(reply, file) : companyLogoNotFound(reply, request.id);
  });
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
  const payload = request.authContext?.payload;
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

function companyLogoUpload(value: unknown): CompanyLogoUploadPayload {
  const input =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const companyId = Number(input.companyId);
  if (!Number.isSafeInteger(companyId) || companyId <= 0) {
    throw AppError.validation("Company ID is required for logo upload.");
  }
  if (typeof input.contentBase64 !== "string" || !input.contentBase64.trim()) {
    throw AppError.validation("Company logo content is required.");
  }
  return {
    companyId,
    contentBase64: input.contentBase64,
    variant: companyLogoVariant(input.variant)
  };
}

function companyLogoParams(value: unknown) {
  const input =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const companyId = Number(input.companyId);
  if (!Number.isSafeInteger(companyId) || companyId <= 0) {
    throw AppError.validation("Company ID is invalid.");
  }
  return { companyId, variant: companyLogoVariant(input.variant) };
}

function companyLogoVariant(value: unknown): "logo" | "logo-dark" {
  if (value === "logo" || value === "logo-dark") return value;
  throw AppError.notFound("Company logo was not found.");
}

function requestHost(request: FastifyRequest) {
  return String(request.headers["x-forwarded-host"] ?? request.headers.host ?? "");
}

function companyLogoNotFound(reply: FastifyReply, requestId: string) {
  return reply
    .code(404)
    .send(
      fail(
        { code: "COMPANY_LOGO_NOT_FOUND", message: "Company logo was not found." },
        { requestId }
      )
    );
}

function sendCompanyLogo(
  reply: FastifyReply,
  file: NonNullable<Awaited<ReturnType<StorageManagerService["readCompanyLogo"]>>>
) {
  return reply
    .header("cache-control", "no-store")
    .header("content-type", file.mimeType)
    .header("content-length", String(file.sizeBytes))
    .send(file.buffer);
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
