import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "@codexsun/framework/errors";
import { registerCoreTenantDatabaseConnection } from "@codexsun/core-api";
import { registerBillingTenantDatabaseConnection } from "@codexsun/billing-api";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import {
  canonicalAppHost,
  normalizeTenantDomain
} from "../modules/tenant-domain/tenant-domain.repository.js";
import { getTenantDatabase, resolveTenantDatabasePassword } from "../database/tenant-database.js";
import { AuthSessionRepository, type AuthSessionRecord } from "./auth-session.repository.js";
import { verifyAuthToken, type AuthTokenPayload } from "./jwt.js";
import { readEncryptedSessionCookie } from "./session-cookie.js";

declare module "fastify" {
  interface FastifyRequest {
    authContext?: {
      payload: AuthTokenPayload;
      session: AuthSessionRecord | null;
      source: "bearer" | "cookie";
    };
  }
}

const sessions = new AuthSessionRepository();
const tenants = new TenantRepository();
const publicAuthPaths = new Set([
  "/auth/login",
  "/auth/development/tenant-login",
  "/auth/tenant-context"
]);

export function registerAuthRequestContext(app: FastifyInstance) {
  app.decorateRequest("authContext", undefined);
  app.addHook("onRequest", async (request) => {
    const source = bearerToken(request) ? "bearer" : "cookie";
    const token = bearerToken(request) || readEncryptedSessionCookie(request);
    if (!token) return;

    const payload = verifyAuthToken(token);
    const session = payload ? await sessions.findActive(payload.jti) : null;
    if (!payload || (source === "cookie" && !session) || !claimsMatchSession(payload, session)) {
      if (publicAuthPaths.has(request.routeOptions.url ?? request.url.split("?")[0] ?? "")) return;
      throw AppError.unauthorized("Session expired. Please sign in again.");
    }

    const host = requestHost(request);
    if (!hostMatchesClaims(host, payload)) {
      if (publicAuthPaths.has(request.routeOptions.url ?? "")) return;
      throw AppError.unauthorized("This session is not valid for the requested domain.");
    }
    if (source === "cookie") enforceBrowserRequestOrigin(request, host);

    if (payload.userType === "tenant") {
      const tenant = payload.tenantId ? await tenants.findByIdOrCode(payload.tenantId) : null;
      if (
        !tenant ||
        tenant.status !== "active" ||
        tenant.dbName !== payload.tenantDbName ||
        tenant.tenantCode !== payload.tenantCode
      ) {
        throw AppError.unauthorized("Tenant access is no longer valid.");
      }
      if (
        payload.tenantAccessMode === "custom_domain" &&
        (await tenants.findByDomain(host))?.uuid !== tenant.uuid
      ) {
        throw AppError.unauthorized("The custom domain is not verified for this tenant.");
      }
      const connection = {
        database: tenant.dbName,
        host: tenant.dbHost,
        password: resolveTenantDatabasePassword(tenant),
        port: tenant.dbPort,
        user: tenant.dbUser
      };
      registerCoreTenantDatabaseConnection(connection);
      registerBillingTenantDatabaseConnection(connection);
      getTenantDatabase(tenant);
      request.headers.authorization = `Bearer ${token}`;
      request.headers["x-tenant-id"] = tenant.uuid;
      request.headers["x-tenant-db"] = tenant.dbName;
      request.tenantId = tenant.uuid;
      const defaults = session?.context.defaultCompany;
      if (defaults) {
        request.headers["x-company-id"] ??= String(defaults.companyId);
        request.headers["x-financial-year-id"] ??= String(defaults.financialYearId);
      }
    } else {
      request.headers.authorization = `Bearer ${token}`;
    }

    request.authContext = { payload, session, source };
    if (session && Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      await sessions.touch(payload.jti);
    }
  });
}

export function requestHost(request: FastifyRequest) {
  return normalizeTenantDomain(request.headers.host ?? "");
}

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

function claimsMatchSession(payload: AuthTokenPayload, session: AuthSessionRecord | null) {
  if (!session) return true;
  return (
    session.jti === payload.jti &&
    session.userUuid === payload.userId &&
    session.userType === payload.userType &&
    session.tenantId === (payload.tenantId ?? null) &&
    session.tenantDbName === (payload.tenantDbName ?? null) &&
    session.loginHost === payload.loginHost &&
    session.tenantAccessMode === payload.tenantAccessMode
  );
}

function hostMatchesClaims(host: string, payload: AuthTokenPayload) {
  if (!payload.loginHost) return true;
  if (payload.tenantAccessMode === "shared_domain" || payload.tenantAccessMode === "platform") {
    return host === canonicalAppHost() && payload.loginHost === canonicalAppHost();
  }
  return host === payload.loginHost;
}

export function enforceBrowserRequestOrigin(request: FastifyRequest, host = requestHost(request)) {
  if (request.headers["sec-fetch-site"] === "cross-site") {
    throw AppError.forbidden("Cross-site session requests are not allowed.");
  }
  const origin = request.headers.origin;
  if (!origin) return;
  try {
    if (normalizeTenantDomain(new URL(origin).hostname) !== host) {
      throw AppError.forbidden("Request origin does not match the application domain.");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.forbidden("Request origin is invalid.");
  }
}
