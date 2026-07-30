import { apiGet } from "../../shared/api/platform-api";
import type { TenantPublicPortal } from "./tenant-portal.types";

export function getTenantPublicPortal() {
  return apiGet<TenantPublicPortal>("/public/app-portal");
}
