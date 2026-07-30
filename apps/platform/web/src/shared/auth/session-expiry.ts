import type { Desk } from "../api/platform-api";

export const SESSION_EXPIRED_REASON = "session-expired";

const loginPaths: Record<Desk, string> = {
  admin: "/admin/login",
  sa: "/sa/login",
  tenant: "/login"
};

let clearSession: () => void = () => undefined;
let redirectStarted = false;
let interceptorInstalled = false;

export function protectedDeskFromPathname(pathname: string): Desk | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return pathname === "/admin/login" ? null : "admin";
  }
  if (pathname === "/sa" || pathname.startsWith("/sa/")) {
    return pathname === "/sa/login" ? null : "sa";
  }
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    return "tenant";
  }
  return null;
}

export function sessionExpiredLoginPath(desk: Desk): string {
  return `${loginPaths[desk]}?reason=${SESSION_EXPIRED_REASON}`;
}

export function hasSessionExpiredReason(search: string): boolean {
  return new URLSearchParams(search).get("reason") === SESSION_EXPIRED_REASON;
}

export function redirectForExpiredSession(desk?: Desk): boolean {
  const activeDesk = desk ?? protectedDeskFromPathname(window.location.pathname);
  if (!activeDesk || redirectStarted) return false;

  redirectStarted = true;
  clearSession();
  window.location.replace(sessionExpiredLoginPath(activeDesk));
  return true;
}

export function installSessionExpiryInterceptor(onClearSession: () => void): void {
  clearSession = onClearSession;
  if (interceptorInstalled) return;

  interceptorInstalled = true;
  const browserFetch = window.fetch.bind(window);
  window.fetch = async (...arguments_: Parameters<typeof window.fetch>) => {
    const response = await browserFetch(...arguments_);
    if (response.status === 401) {
      redirectForExpiredSession();
    }
    return response;
  };
}
