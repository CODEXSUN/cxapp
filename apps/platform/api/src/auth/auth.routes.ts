import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fail, ok } from "@codexsun/framework/http";
import { AuthService } from "./auth.service.js";
import { signAuthToken, verifyAuthToken, type AuthUserType } from "./jwt.js";
import { env } from "../env.js";

const authService = new AuthService();

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/development/tenant-login", async (request, reply) => {
    if (
      env.NODE_ENV !== "development" ||
      env.DEV_AUTO_TENANT_LOGIN !== "1" ||
      env.DEFAULT_TENANT_CORPORATE_ID.trim().toUpperCase() !== "CODEXSUN"
    ) {
      return reply.code(404).send(
        fail(
          {
            code: "AUTH_DEVELOPMENT_LOGIN_DISABLED",
            message: "Development tenant login is disabled."
          },
          { requestId: request.id }
        )
      );
    }

    const result = await authService.login({
      corporateId: "CODEXSUN",
      desk: "tenant",
      domain: requestDomain(request),
      email: env.DEFAULT_TENANT_ADMIN_EMAIL,
      password: env.DEFAULT_TENANT_ADMIN_PASSWORD
    });

    if (!result || !("tenantId" in result)) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_DEVELOPMENT_LOGIN_FAILED",
            message: "CODEXSUN development credentials are invalid."
          },
          { requestId: request.id }
        )
      );
    }

    writeSessionCookie(reply, result.userType, result.accessToken);
    return ok(result, {
      requestId: request.id,
      tenantId: result.tenantId
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = request.body as LoginBody | undefined;
    const loginInput: {
      corporateId?: string;
      desk?: AuthUserType | "admin" | "sa";
      domain: string;
      email?: string;
      password?: string;
    } = {
      domain: requestDomain(request)
    };
    if (body?.desk) loginInput.desk = body.desk;
    if (body?.email) loginInput.email = body.email;
    if (body?.password) loginInput.password = body.password;
    const corporateId = body?.corporateId ?? body?.tenantCode;
    if (corporateId) loginInput.corporateId = corporateId;
    const result = await authService.login(loginInput);

    if (!result) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_INVALID_CREDENTIALS",
            message: "Invalid credentials or workspace."
          },
          { requestId: request.id }
        )
      );
    }

    writeSessionCookie(reply, result.userType, result.accessToken);
    return ok(result, {
      requestId: request.id,
      ...("tenantId" in result && result.tenantId ? { tenantId: result.tenantId } : {})
    });
  });

  app.get("/auth/session", async (request, reply) => {
    const session = sessionToken(request);
    const payload = session.token ? verifyAuthToken(session.token) : null;
    if (!payload) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_SESSION_EXPIRED",
            message: "Session expired. Please sign in again."
          },
          { requestId: request.id }
        )
      );
    }

    const renewedToken =
      payload.exp - Math.floor(Date.now() / 1000) <= env.AUTH_SESSION_RENEWAL_HOURS * 60 * 60
        ? signRenewedToken(payload)
        : null;
    if (renewedToken) writeSessionCookie(reply, payload.userType, renewedToken);

    return ok(
      {
        ...((session.source === "cookie" || renewedToken) && {
          accessToken: renewedToken ?? session.token
        }),
        authenticated: true,
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
      {
        requestId: request.id,
        ...(payload.tenantId ? { tenantId: payload.tenantId } : {})
      }
    );
  });

  app.post("/auth/logout", async (request, reply) => {
    const desk = requestedUserType(request);
    if (desk) clearSessionCookie(reply, desk);
    else {
      clearSessionCookie(reply, "tenant");
      clearSessionCookie(reply, "staff");
      clearSessionCookie(reply, "super_admin");
    }
    return ok({ loggedOut: true }, { requestId: request.id });
  });
}

type LoginBody = {
  corporateId?: string;
  desk?: AuthUserType | "admin" | "sa";
  email?: string;
  password?: string;
  tenantCode?: string;
};

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }
  return authorization.slice("Bearer ".length).trim();
}

const sessionCookieNames: Record<AuthUserType, string> = {
  staff: "codexsun_session_admin",
  super_admin: "codexsun_session_sa",
  tenant: "codexsun_session_tenant"
};

function sessionToken(request: FastifyRequest) {
  const bearer = bearerToken(request);
  if (bearer) return { source: "bearer" as const, token: bearer };
  if (env.AUTH_MODE === "jwt") return { source: "none" as const, token: "" };

  const userType = requestedUserType(request);
  if (userType) {
    return {
      source: "cookie" as const,
      token: request.cookies[sessionCookieNames[userType]] ?? ""
    };
  }

  for (const cookieName of Object.values(sessionCookieNames)) {
    const token = request.cookies[cookieName];
    if (token) return { source: "cookie" as const, token };
  }
  return { source: "none" as const, token: "" };
}

function requestedUserType(request: FastifyRequest): AuthUserType | null {
  const value = request.headers["x-auth-desk"];
  const desk = Array.isArray(value) ? value[0] : value;
  if (desk === "tenant") return "tenant";
  if (desk === "admin" || desk === "staff") return "staff";
  if (desk === "sa" || desk === "super_admin") return "super_admin";
  return null;
}

function writeSessionCookie(reply: FastifyReply, userType: AuthUserType, token: string) {
  if (env.AUTH_MODE === "jwt") return;
  reply.setCookie(sessionCookieNames[userType], token, sessionCookieOptions());
}

function clearSessionCookie(reply: FastifyReply, userType: AuthUserType) {
  reply.clearCookie(sessionCookieNames[userType], {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: env.NODE_ENV === "production"
  });
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: env.AUTH_SESSION_TTL_HOURS * 60 * 60,
    path: "/",
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production"
  };
}

function signRenewedToken(payload: ReturnType<typeof verifyAuthToken> & {}) {
  if (!payload) return null;
  return signAuthToken({
    email: payload.email,
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.tenantCode ? { tenantCode: payload.tenantCode } : {}),
    ...(payload.tenantDbName ? { tenantDbName: payload.tenantDbName } : {}),
    ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
    ...(payload.tenantUuid ? { tenantUuid: payload.tenantUuid } : {}),
    userId: payload.userId,
    userType: payload.userType
  });
}

function requestDomain(request: FastifyRequest) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || request.headers.host || "";
  return String(host);
}
