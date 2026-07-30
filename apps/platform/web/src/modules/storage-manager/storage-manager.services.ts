import { apiGet, apiPost, getToken } from "../../shared/api/platform-api";
import { requiredClientEnv } from "../../shared/env/client-env";
import type {
  StorageBrowserState,
  StorageListing,
  StorageRootSummary
} from "./storage-manager.types";
import { cleanStorageState } from "./storage-manager.schema";

const apiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");

export function getStorageRoots() {
  return apiGet<StorageRootSummary>("/admin/storage/roots", "sa");
}

export function listStorage(state: StorageBrowserState) {
  const params = storageParams(state);
  return apiGet<StorageListing>(`/admin/storage/list?${params.toString()}`, "sa");
}

export function createStorageFolder(state: StorageBrowserState, name: string) {
  return apiPost<StorageListing>(
    "/admin/storage/folders",
    { ...cleanStorageState(state), name },
    "sa"
  );
}

export function uploadStorageFile(state: StorageBrowserState, file: File) {
  return fileToBase64(file).then((contentBase64) =>
    apiPost<StorageListing>(
      "/admin/storage/upload",
      { ...cleanStorageState(state), contentBase64, fileName: file.name, mimeType: file.type },
      "sa"
    )
  );
}

export async function downloadStorageFile(state: StorageBrowserState, file: string) {
  const params = storageParams(state);
  params.set("file", file);
  const token = getToken("sa");
  const response = await fetch(`${apiBaseUrl}/admin/storage/download?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    throw new Error("Download failed.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.split("/").pop() || "download";
  anchor.click();
  URL.revokeObjectURL(url);
}

function storageParams(state: StorageBrowserState) {
  const clean = cleanStorageState(state);
  const params = new URLSearchParams();
  params.set("scope", clean.scope);
  params.set("visibility", clean.visibility);
  if (clean.path) params.set("path", clean.path);
  if (clean.scope === "tenant" && clean.tenantId) params.set("tenantId", clean.tenantId);
  return params;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? (value.split(",").pop() ?? "") : value);
    };
    reader.readAsDataURL(file);
  });
}
