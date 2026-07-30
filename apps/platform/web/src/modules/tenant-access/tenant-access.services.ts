import { apiGet } from "../../shared/api/platform-api";
import type { TenantAccessSummary } from "./tenant-access.types";

export function listTenantAccess() {
  return apiGet<TenantAccessSummary[]>("/admin/tenant-access", "sa");
}
