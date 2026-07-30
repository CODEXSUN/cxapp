import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { PlatformApp, PlatformAppSavePayload } from "./app-registry.types";
export function listPlatformApps() {
  return apiGet<PlatformApp[]>("/admin/apps", "sa");
}
export function createPlatformApp(payload: PlatformAppSavePayload) {
  return apiPost<PlatformApp>("/admin/apps", payload, "sa");
}
export function updatePlatformApp(id: number, payload: PlatformAppSavePayload) {
  return apiPut<PlatformApp>(`/admin/apps/${id}`, payload, "sa");
}
