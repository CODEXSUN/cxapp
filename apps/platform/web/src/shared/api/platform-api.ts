import { requiredClientEnv } from "../env/client-env";

const apiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");

export type Desk = "sa" | "admin" | "tenant";

const TOKEN_KEYS: Record<Desk, string> = {
  admin: "codexsun_session_admin",
  sa: "codexsun_session_sa",
  tenant: "codexsun_session_tenant"
};

const TENANT_ID_KEY = "codexsun_tenant_id";
const TENANT_DB_NAME_KEY = "codexsun_tenant_db_name";
const TENANT_RUNTIME_KEYS = [
  "codexsun.tenant.landing-app.live",
  "codexsun.tenant.company-id",
  "codexsun.tenant.financial-year-id"
] as const;

type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

type TenantTokenClaims = {
  exp?: number;
  tenantDbName?: string;
  tenantId?: string;
  userType?: string;
};

export type SessionData = {
  accessToken?: string;
  authenticated: boolean;
  email: string;
  expiresAt: string;
  name?: string;
  tenantCode?: string;
  tenantDbName?: string;
  tenantId?: string;
  tenantUuid?: string;
  userType: string;
};

const sessionRequests = new Map<Desk, Promise<SessionData>>();

function tenantClaims(token: string | null): TenantTokenClaims | null {
  if (!token) return null;
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as TenantTokenClaims;
    return claims.userType === "tenant" ? claims : null;
  } catch {
    return null;
  }
}

export function getToken(desk: Desk): string | null {
  try {
    return localStorage.getItem(TOKEN_KEYS[desk]);
  } catch {
    return null;
  }
}

export function setToken(desk: Desk, token: string): void {
  try {
    localStorage.setItem(TOKEN_KEYS[desk], token);
  } catch {}
}

export function clearToken(desk: Desk): void {
  try {
    localStorage.removeItem(TOKEN_KEYS[desk]);
  } catch {}
}

export function getTenantId(): string | null {
  try {
    return localStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function setTenantId(id: string | undefined): void {
  try {
    if (id) localStorage.setItem(TENANT_ID_KEY, id);
    else localStorage.removeItem(TENANT_ID_KEY);
  } catch {}
}

export function getTenantDbName(): string | null {
  try {
    return localStorage.getItem(TENANT_DB_NAME_KEY);
  } catch {
    return null;
  }
}

export function setTenantDbName(dbName: string | undefined): void {
  try {
    if (dbName) localStorage.setItem(TENANT_DB_NAME_KEY, dbName);
    else localStorage.removeItem(TENANT_DB_NAME_KEY);
  } catch {}
}

function clearTenantSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEYS.tenant);
    localStorage.removeItem(TENANT_ID_KEY);
    localStorage.removeItem(TENANT_DB_NAME_KEY);
    for (const key of TENANT_RUNTIME_KEYS) localStorage.removeItem(key);
  } catch {}
}

function writeTenantSession(input: {
  accessToken: string;
  tenantDbName: string;
  tenantId: string;
}): void {
  setTenantId(input.tenantId);
  setTenantDbName(input.tenantDbName);
  setToken("tenant", input.accessToken);
}

function authHeaders(desk?: Desk): Record<string, string> {
  const headers: Record<string, string> = {};
  const storedToken = desk ? getToken(desk) : null;
  const token = tokenIsUsable(storedToken) ? storedToken : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (desk) headers["x-auth-desk"] = desk;
  if (desk === "tenant") {
    // The signed token is the authority for request routing. Local storage is only
    // a compatibility mirror for the independently bundled Core and Billing apps.
    const claims = tenantClaims(token);
    const tenantId = claims?.tenantId ?? getTenantId();
    const tenantDbName = claims?.tenantDbName ?? getTenantDbName();
    if (tenantId) headers["x-tenant-id"] = tenantId;
    if (tenantDbName) headers["x-tenant-db"] = tenantDbName;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}, desk?: Desk): Promise<T> {
  if (desk && path !== "/auth/session" && !tokenIsUsable(getToken(desk))) {
    await restoreSession(desk).catch(() => undefined);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(desk),
      ...options.headers
    }
  });

  const responseText = await response.text();
  let envelope: ApiEnvelope<T> | null = null;
  if (responseText) {
    try {
      envelope = JSON.parse(responseText) as ApiEnvelope<T>;
    } catch {
      if (!response.ok) throw new Error(apiUnavailableMessage(response));
      throw new Error("Platform API returned an invalid response.");
    }
  }

  if (!envelope) {
    throw new Error(
      response.ok ? "Platform API returned an empty response." : apiUnavailableMessage(response)
    );
  }

  if (!response.ok || !envelope.success) {
    throw new Error(envelope.success ? "Request failed" : envelope.error.message);
  }
  return envelope.data;
}

function tokenIsUsable(token: string | null) {
  if (!token) return false;
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as TenantTokenClaims;
    return typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function restoreSession(desk: Desk): Promise<SessionData> {
  const current = sessionRequests.get(desk);
  if (current) return current;

  const pending = request<SessionData>("/auth/session", { method: "GET" }, desk)
    .then((session) => {
      if (session.accessToken) setToken(desk, session.accessToken);
      if (desk === "tenant") {
        setTenantId(session.tenantId);
        setTenantDbName(session.tenantDbName);
      }
      return session;
    })
    .finally(() => sessionRequests.delete(desk));
  sessionRequests.set(desk, pending);
  return pending;
}

function apiUnavailableMessage(response: Response): string {
  if (response.status >= 500) {
    return `Platform API is unavailable (${response.status} ${response.statusText || "Server Error"}).`;
  }

  return `Platform API request failed (${response.status} ${response.statusText || "Request Error"}).`;
}

export function apiGet<T>(path: string, desk?: Desk): Promise<T> {
  return request<T>(path, { method: "GET" }, desk);
}

export function apiPost<T>(path: string, data?: unknown, desk?: Desk): Promise<T> {
  return request<T>(path, { body: JSON.stringify(data ?? {}), method: "POST" }, desk);
}

export function apiPut<T>(path: string, data?: unknown, desk?: Desk): Promise<T> {
  return request<T>(path, { body: JSON.stringify(data ?? {}), method: "PUT" }, desk);
}

export function apiDelete<T>(path: string, desk?: Desk): Promise<T> {
  return request<T>(path, { method: "DELETE" }, desk);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

export async function login(input: {
  corporateId?: string;
  desk: Desk;
  email: string;
  password: string;
  tenantCode?: string;
}) {
  if (input.desk === "tenant") clearTenantSession();
  else clearToken(input.desk);

  try {
    const data = await apiPost<{
      accessToken?: string;
      corporateId?: string;
      email: string;
      name?: string;
      tenantId?: string;
      tenantDbName?: string;
      tenantCode?: string;
      tenantUuid?: string;
      userType: string;
    }>("/auth/login", input);

    if (input.desk === "tenant") {
      if (!data.accessToken || !data.tenantId || !data.tenantDbName) {
        throw new Error("Tenant login response is incomplete.");
      }
      writeTenantSession({
        accessToken: data.accessToken,
        tenantDbName: data.tenantDbName,
        tenantId: data.tenantId
      });
    } else if (data.accessToken) {
      setToken(input.desk, data.accessToken);
    }

    return { data, success: true };
  } catch (error: unknown) {
    return { error: { message: errorMessage(error) }, success: false };
  }
}

export async function developmentTenantLogin() {
  clearTenantSession();

  try {
    const data = await apiPost<{
      accessToken: string;
      email: string;
      name?: string;
      tenantCode: string;
      tenantDbName: string;
      tenantId: string;
      tenantUuid: string;
      userType: "tenant";
    }>("/auth/development/tenant-login");

    writeTenantSession(data);
    return { data, success: true } as const;
  } catch (error: unknown) {
    return { error: { message: errorMessage(error) }, success: false } as const;
  }
}

export function forgotPassword(input: { corporateId?: string; desk: Desk; email: string }) {
  return apiPost<{ accepted: true; message: string }>("/auth/password/forgot", input);
}

export function resetPassword(input: { password: string; token: string }) {
  return apiPost<{ reset: true }>("/auth/password/reset", input);
}

export async function logout(desk: Desk): Promise<void> {
  try {
    await apiPost("/auth/logout", undefined, desk);
  } catch {}
  clearToken(desk);
  if (desk === "tenant") {
    clearTenantSession();
  }
}
