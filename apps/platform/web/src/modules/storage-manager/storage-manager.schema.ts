import type { StorageBrowserState } from "./storage-manager.types";

export function cleanStorageState(state: StorageBrowserState): StorageBrowserState {
  return {
    path: cleanPath(state.path),
    scope: state.scope === "tenant" ? "tenant" : "app",
    tenantId: state.tenantId,
    visibility: state.visibility === "private" ? "private" : "public"
  };
}

export function cleanPath(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..")
    .join("/");
}

export function fileSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
