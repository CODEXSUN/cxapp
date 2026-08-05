import type { FastifyInstance } from "fastify";
import { AppError } from "@cxapp/framework/errors";
import { ok } from "@cxapp/framework/http";
import { requireSuperAdmin } from "../../auth/super-admin.guard.js";
import { verifyAuthToken } from "../../auth/jwt.js";
import { QueueManagerService } from "./queue-manager.service.js";
import type { QueueJobFilters, QueueJobStatus } from "./queue-manager.types.js";
import { registerContractRoute } from "@cxapp/framework/http";
import { z } from "zod";

const service = new QueueManagerService();
const clientArtifactSchema = z
  .object({
    artifactType: z.literal("pdf"),
    category: z.string().trim().min(1).max(80),
    fileName: z.string().trim().min(1).max(255),
    label: z.string().trim().min(1).max(255),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(15 * 1024 * 1024)
  })
  .strict();

export async function registerQueueManagerRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "POST",
    url: "/tenant/queue/artifacts",
    preHandler: requireTenantQueueUser,
    schemas: {
      body: clientArtifactSchema,
      response: z
        .object({
          jobId: z.number().int().positive(),
          jobUuid: z.string().min(1),
          status: z.enum(["cancelled", "completed", "failed", "pending", "running"])
        })
        .strict()
    },
    handler: ({ body, request }) => {
      const identity = tenantQueueIdentity(request);
      return service.enqueueClientArtifact(body, identity, request.id);
    }
  });
  app.get("/admin/queue/settings", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.runtimeSettings(), { requestId: request.id })
  );
  registerContractRoute(app, {
    method: "PUT",
    url: "/admin/queue/settings/backend",
    preHandler: requireSuperAdmin,
    schemas: {
      body: z.object({ backend: z.enum(["database", "bullmq-redis"]) }).strict(),
      response: z.object({
        availableBackends: z.array(z.enum(["database", "bullmq-redis"])),
        backend: z.enum(["database", "bullmq-redis"]),
        backendLabel: z.string(),
        canRunInline: z.boolean(),
        completed: z.number(),
        failed: z.number(),
        pending: z.number(),
        redisConfigured: z.boolean(),
        running: z.number(),
        updatedAt: z.string().nullable(),
        updatedBy: z.string()
      })
    },
    handler: ({ body, request }) =>
      service.switchBackend(body.backend, actorEmail(request.headers.authorization))
  });
  app.get("/admin/queue/jobs", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.listJobs(filtersFromQuery(request.query)), { requestId: request.id })
  );
  app.get("/admin/queue/jobs/:id", { preHandler: requireSuperAdmin }, async (request, reply) => {
    const job = await service.findJob(Number((request.params as { id: string }).id));
    if (!job)
      return reply
        .code(404)
        .send(notFound("QUEUE_JOB_NOT_FOUND", "Queue job was not found.", request.id));
    return ok(job, { requestId: request.id });
  });
  app.post(
    "/admin/queue/jobs/:id/run",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const job = await service.runJob(Number((request.params as { id: string }).id));
      if (!job)
        return reply
          .code(404)
          .send(notFound("QUEUE_JOB_NOT_FOUND", "Queue job was not found.", request.id));
      return ok(job, { requestId: request.id });
    }
  );
  app.post(
    "/admin/queue/jobs/:id/retry",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const job = await service.retryJob(Number((request.params as { id: string }).id));
      if (!job)
        return reply
          .code(404)
          .send(notFound("QUEUE_JOB_NOT_FOUND", "Queue job was not found.", request.id));
      return ok(job, { requestId: request.id });
    }
  );
  app.post(
    "/admin/queue/jobs/:id/cancel",
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const job = await service.cancelJob(Number((request.params as { id: string }).id));
      if (!job)
        return reply
          .code(404)
          .send(notFound("QUEUE_JOB_NOT_FOUND", "Queue job was not found.", request.id));
      return ok(job, { requestId: request.id });
    }
  );
  app.post("/admin/queue/cleanup", { preHandler: requireSuperAdmin }, async (request) =>
    ok(await service.cleanupRetainedJobs(), { requestId: request.id })
  );
}

async function requireTenantQueueUser(request: Parameters<typeof tenantQueueIdentity>[0]) {
  tenantQueueIdentity(request);
}

function tenantQueueIdentity(request: import("fastify").FastifyRequest) {
  const payload = request.authContext?.payload;
  if (payload?.userType !== "tenant" || !payload.tenantId) {
    throw AppError.forbidden("Tenant queue access requires an active tenant session.");
  }
  return {
    actorEmail: payload.email || "tenant-user",
    tenantId: payload.tenantId
  };
}

function actorEmail(authorization: string | undefined) {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  return (token ? verifyAuthToken(token)?.email : null) ?? "super-admin";
}

function filtersFromQuery(query: unknown): QueueJobFilters {
  const input =
    typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};
  const status =
    typeof input.status === "string" &&
    ["cancelled", "completed", "failed", "pending", "running"].includes(input.status)
      ? (input.status as QueueJobStatus)
      : undefined;
  return {
    ...(typeof input.correlationId === "string" && input.correlationId.trim()
      ? { correlationId: input.correlationId.trim() }
      : {}),
    ...(typeof input.queueName === "string" && input.queueName.trim()
      ? { queueName: input.queueName.trim() }
      : {}),
    ...(status ? { status } : {}),
    ...(typeof input.tenantId === "string" && input.tenantId.trim()
      ? { tenantId: input.tenantId.trim() }
      : {})
  };
}

function notFound(code: string, message: string, requestId: string) {
  return {
    error: { code, message },
    meta: { requestId, timestamp: new Date().toISOString() },
    success: false as const
  };
}
