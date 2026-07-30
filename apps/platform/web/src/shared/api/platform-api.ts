import { requiredClientEnv } from "../env/client-env";

const apiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
export type Desk = "sa" | "admin" | "tenant";

const LEGACY_TOKEN_KEYS = [
  "codexsun_session_admin",
  "codexsun_session_sa",
  "codexsun_session_tenant"
] as const;
const TENANT_ID_KEY = "codexsun_tenant_id";
const TENANT_DB_NAME_KEY = "codexsun_tenant_db_name";
const SESSION_CONTEXT_KEY = "codexsun.auth.context";
const SESSION_IDENTITY_KEY = "codexsun.auth.identity";
const TENANT_RUNTIME_KEYS = [
  "codexsun.tenant.landing-app.live",
  "codexsun.tenant.company-id",
  "codexsun.tenant.financial-year-id"
] as const;

type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

export type SessionContext = {
  cachedAt: string;
  company: { code: string; id: number; name: string } | null;
  defaultCompany: {
    companyId: number;
    companyName: string;
    financialYearId: number;
    financialYearName: string;
    landingApp: string;
  } | null;
  enabledModuleKeys: string[];
  landingPage: string;
  safeSettings: Record<string, unknown>;
  tenant: { code: string; id: string; name: string } | null;
};

export type SessionData = {
  authenticated: boolean;
  context?: SessionContext;
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

export function getToken(_desk: Desk): string | null {
  clearLegacyTokens();
  return null;
}

export function setToken(_desk: Desk, _token: string): void {
  clearLegacyTokens();
}

export function clearToken(_desk: Desk): void {
  clearLegacyTokens();
}

export function getTenantId(): string | null {
  try {
    return sessionStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function setTenantId(id: string | undefined): void {
  try {
    if (id) sessionStorage.setItem(TENANT_ID_KEY, id);
    else sessionStorage.removeItem(TENANT_ID_KEY);
  } catch {}
}

export function getTenantDbName(): string | null {
  try {
    return sessionStorage.getItem(TENANT_DB_NAME_KEY);
  } catch {
    return null;
  }
}

export function setTenantDbName(dbName: string | undefined): void {
  try {
    if (dbName) sessionStorage.setItem(TENANT_DB_NAME_KEY, dbName);
    else sessionStorage.removeItem(TENANT_DB_NAME_KEY);
  } catch {}
}

export function getSessionContext(): SessionContext | null {
  try {
    const value = sessionStorage.getItem(SESSION_CONTEXT_KEY);
    return value ? (JSON.parse(value) as SessionContext) : null;
  } catch {
    return null;
  }
}

export function getSessionIdentity(): { email: string; name: string } | null {
  try {
    const value = sessionStorage.getItem(SESSION_IDENTITY_KEY);
    return value ? (JSON.parse(value) as { email: string; name: string }) : null;
  } catch {
    return null;
  }
}

export function clearBrowserSession(): void {
  sessionRequests.clear();
  clearLegacyTokens();
  try {
    sessionStorage.removeItem(TENANT_ID_KEY);
    sessionStorage.removeItem(TENANT_DB_NAME_KEY);
    sessionStorage.removeItem(SESSION_CONTEXT_KEY);
    sessionStorage.removeItem(SESSION_IDENTITY_KEY);
    for (const key of TENANT_RUNTIME_KEYS) localStorage.removeItem(key);
  } catch {}
}

function writeSession(data: {
  context?: SessionContext;
  email: string;
  name?: string;
  tenantDbName?: string;
  tenantId?: string;
}) {
  try {
    if (data.tenantId) sessionStorage.setItem(TENANT_ID_KEY, data.tenantId);
    if (data.tenantDbName) sessionStorage.setItem(TENANT_DB_NAME_KEY, data.tenantDbName);
    if (data.context) sessionStorage.setItem(SESSION_CONTEXT_KEY, JSON.stringify(data.context));
    sessionStorage.setItem(
      SESSION_IDENTITY_KEY,
      JSON.stringify({ email: data.email, name: data.name ?? "" })
    );
  } catch {}
}

function authHeaders(desk?: Desk): Record<string, string> {
  return desk ? { "x-auth-desk": desk } : {};
}

async function request<T>(path: string, options: RequestInit = {}, desk?: Desk): Promise<T> {
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
      throw new Error(apiUnavailableMessage(response));
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

export function restoreSession(desk: Desk): Promise<SessionData> {
  const current = sessionRequests.get(desk);
  if (current) return current;
  const pending = request<SessionData>("/auth/session", { method: "GET" }, desk)
    .then((session) => {
      writeSession(session);
      return session;
    })
    .finally(() => sessionRequests.delete(desk));
  sessionRequests.set(desk, pending);
  return pending;
}

function apiUnavailableMessage(response: Response) {
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
  clearBrowserSession();
  try {
    const data = await apiPost<
      SessionData & {
        corporateId?: string;
      }
    >("/auth/login", input);
    if (input.desk === "tenant" && (!data.tenantId || !data.tenantDbName)) {
      throw new Error("Tenant login response is incomplete.");
    }
    writeSession(data);
    return { data, success: true } as const;
  } catch (error: unknown) {
    return { error: { message: errorMessage(error) }, success: false } as const;
  }
}

export async function developmentTenantLogin() {
  clearBrowserSession();
  try {
    const data = await apiPost<SessionData>("/auth/development/tenant-login");
    if (!data.tenantId || !data.tenantDbName) {
      throw new Error("Tenant login response is incomplete.");
    }
    writeSession(data);
    return { data, success: true } as const;
  } catch (error: unknown) {
    return { error: { message: errorMessage(error) }, success: false } as const;
  }
}

export function getTenantLoginContext() {
  return apiGet<{
    corporateIdRequired: boolean;
    host: string;
    mode: "custom_domain" | "shared_domain" | "unknown";
    tenantName: string | null;
  }>("/auth/tenant-context");
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
  clearBrowserSession();
}

function clearLegacyTokens() {
  try {
    for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  } catch {}
}

clearLegacyTokens();
