import { apiGet, apiPost, apiPut } from "../../shared/api/devkit-api";
import type {
  PlatformRegistryGroup,
  PlatformRegistryModule,
  PlatformRegistryPlatform,
  PlatformRegistryResult
} from "./platform-registry.contracts";

export function getPlatformRegistryResult() {
  return apiGet<PlatformRegistryResult>("/admin/platform-registry/result", "dev");
}

export function savePlatformRegistryPlatform(
  payload: Partial<PlatformRegistryPlatform> & {
    key: string;
    name: string;
  }
) {
  return payload.id
    ? apiPut<PlatformRegistryPlatform>(
        `/admin/platform-registry/platforms/${payload.id}`,
        payload,
        "dev"
      )
    : apiPost<PlatformRegistryPlatform>("/admin/platform-registry/platforms", payload, "dev");
}

export function savePlatformRegistryGroup(
  payload: Partial<PlatformRegistryGroup> & {
    key: string;
    name: string;
    platformId: string;
  }
) {
  return payload.id
    ? apiPut<PlatformRegistryGroup>(`/admin/platform-registry/groups/${payload.id}`, payload, "dev")
    : apiPost<PlatformRegistryGroup>("/admin/platform-registry/groups", payload, "dev");
}

export function savePlatformRegistryModule(
  payload: Partial<PlatformRegistryModule> & {
    groupId: string;
    key: string;
    name: string;
  }
) {
  return payload.id
    ? apiPut<PlatformRegistryModule>(
        `/admin/platform-registry/modules/${payload.id}`,
        payload,
        "dev"
      )
    : apiPost<PlatformRegistryModule>("/admin/platform-registry/modules", payload, "dev");
}

export function setPlatformRegistryActive(
  kind: "groups" | "modules" | "platforms",
  id: string,
  active: boolean
) {
  return apiPost<PlatformRegistryGroup | PlatformRegistryModule | PlatformRegistryPlatform>(
    `/admin/platform-registry/${kind}/${id}/${active ? "restore" : "deactivate"}`,
    {},
    "dev"
  );
}
