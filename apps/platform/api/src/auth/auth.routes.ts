import type { FastifyInstance, FastifyRequest } from "fastify";
import { fail, ok } from "@cxapp/framework/http";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { AuthSessionRepository } from "./auth-session.repository.js";
import { clearAllSessionCookies, writeEncryptedSessionCookie } from "./session-cookie.js";
import { enforceBrowserRequestOrigin, requestHost } from "./auth-request-context.js";
import { isSharedApplicationHost } from "../modules/tenant-domain/tenant-domain.repository.js";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import { env } from "../env.js";

const authService = new AuthService();
const sessions = new AuthSessionRepository();
const tenants = new TenantRepository();
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/tenant-context", async (request) => {
    const host = requestHost(request);
    if (isSharedApplicationHost(host)) {
      return ok(
        { corporateIdRequired: true, host, mode: "shared_domain", tenantName: null },
        { requestId: request.id }
      );
    }
    const tenant = await tenants.findByDomain(host);
    return ok(
      tenant
        ? { corporateIdRequired: true, host, mode: "custom_domain", tenantName: tenant.tenantName }
        : { corporateIdRequired: true, host, mode: "unknown", tenantName: null },
      { requestId: request.id }
    );
  });

  app.post("/auth/development/tenant-login", async (request, reply) => {
    enforceBrowserRequestOrigin(request);
    if (
      env.NODE_ENV !== "development" ||
      env.DEV_AUTO_TENANT_LOGIN !== "1" ||
      env.DEFAULT_TENANT_CORPORATE_ID.trim().toUpperCase() !== "CODEXSUN"
    ) {
      return reply
        .code(404)
        .send(
          fail(
            { code: "AUTH_DEVELOPMENT_LOGIN_DISABLED", message: "Development login is disabled." },
            { requestId: request.id }
          )
        );
    }
    await replaceCurrentSession(request);
    clearAllSessionCookies(reply);
    const result = await authService.login({
      corporateId: "CODEXSUN",
      desk: "tenant",
      domain: requestHost(request),
      email: env.DEFAULT_TENANT_ADMIN_EMAIL,
      password: env.DEFAULT_TENANT_ADMIN_PASSWORD
    });
    if (!result || !("tenantId" in result)) {
      return reply.code(401).send(invalidCredentials(request));
    }
    writeEncryptedSessionCookie(reply, result.accessToken);
    return ok(publicResult(request, result), {
      requestId: request.id,
      tenantId: result.tenantId
    });
  });

  app.post("/auth/login", async (request, reply) => {
    enforceBrowserRequestOrigin(request);
    const body = loginSchema.parse(request.body);
    const key = `${request.ip}:${requestHost(request)}:${body.desk}:${body.email.toLowerCase()}`;
    if (isRateLimited(key)) {
      return reply
        .code(429)
        .send(
          fail(
            { code: "AUTH_RATE_LIMITED", message: "Too many sign-in attempts. Try again later." },
            { requestId: request.id }
          )
        );
    }
    await replaceCurrentSession(request);
    clearAllSessionCookies(reply);
    const loginInput: {
      corporateId?: string;
      desk: typeof body.desk;
      domain: string;
      email: string;
      password: string;
    } = {
      desk: body.desk,
      domain: requestHost(request),
      email: body.email,
      password: body.password
    };
    const corporateId = body.corporateId ?? body.tenantCode;
    if (body.desk === "tenant" && !corporateId) {
      return reply.code(400).send(
        fail(
          {
            code: "AUTH_CORPORATE_ID_REQUIRED",
            message: "Corporate ID is required to select your workspace."
          },
          { requestId: request.id }
        )
      );
    }
    if (corporateId) loginInput.corporateId = corporateId;
    const result = await authService.login(loginInput);
    if (!result) {
      recordFailure(key);
      return reply.code(401).send(invalidCredentials(request));
    }
    attempts.delete(key);
    writeEncryptedSessionCookie(reply, result.accessToken);
    return ok(publicResult(request, result), {
      requestId: request.id,
      ...("tenantId" in result && result.tenantId ? { tenantId: result.tenantId } : {})
    });
  });

  app.get("/auth/session", async (request, reply) => {
    const auth = request.authContext;
    if (!auth) {
      return reply
        .code(401)
        .send(
          fail(
            { code: "AUTH_SESSION_EXPIRED", message: "Session expired. Please sign in again." },
            { requestId: request.id }
          )
        );
    }
    const payload = auth.payload;
    return ok(
      {
        authenticated: true,
        context: auth.session?.context,
        email: payload.email,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        name: payload.name,
        sessionIssuedAt: payload.sessionIssuedAt,
        tenantCode: payload.tenantCode,
        tenantDbName: payload.tenantDbName,
        tenantId: payload.tenantId,
        tenantUuid: payload.tenantUuid,
        userType: payload.userType
      },
      { requestId: request.id, ...(payload.tenantId ? { tenantId: payload.tenantId } : {}) }
    );
  });

  app.post("/auth/logout", async (request, reply) => {
    await replaceCurrentSession(request);
    clearAllSessionCookies(reply);
    return ok({ loggedOut: true }, { requestId: request.id });
  });
}

const loginSchema = z
  .object({
    corporateId: z.string().trim().min(1).max(120).optional(),
    desk: z.enum(["tenant", "admin", "staff", "sa", "super_admin"]),
    email: z.string().trim().email().max(180),
    password: z.string().min(1).max(1024),
    tenantCode: z.string().trim().min(1).max(120).optional()
  })
  .strict();

function invalidCredentials(request: FastifyRequest) {
  return fail(
    { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials or workspace." },
    { requestId: request.id }
  );
}

function publicResult<T extends { accessToken: string }>(request: FastifyRequest, result: T) {
  const { accessToken, ...safe } = result;
  return env.AUTH_MODE === "jwt" ||
    String(request.headers["x-auth-token-delivery"] ?? "").toLowerCase() === "bearer"
    ? { ...safe, accessToken }
    : safe;
}

async function replaceCurrentSession(request: FastifyRequest) {
  if (request.authContext?.payload.jti) await sessions.revoke(request.authContext.payload.jti);
}

function isRateLimited(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= 5;
}

function recordFailure(key: string) {
  const current = attempts.get(key);
  attempts.set(key, {
    count: current && current.resetAt > Date.now() ? current.count + 1 : 1,
    resetAt: current && current.resetAt > Date.now() ? current.resetAt : Date.now() + 15 * 60 * 1000
  });
}
