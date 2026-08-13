import { apiGet } from "../../shared/api/platform-api";
import { requiredClientEnv } from "../../shared/env/client-env";
import type { TenantPublicPortal } from "./tenant-portal.types";

const apiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");

export async function getTenantPublicPortal() {
  const portal = await apiGet<TenantPublicPortal>("/public/app-portal");
  return {
    ...portal,
    logoDarkUrl: resolvePortalMediaUrl(portal.logoDarkUrl),
    logoUrl: resolvePortalMediaUrl(portal.logoUrl)
  };
}

function resolvePortalMediaUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
