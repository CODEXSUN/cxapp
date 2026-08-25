import type { BlogAuthorOption, BlogMediaFile, BlogsEditorHost } from "@codexsun/blog/web";
import { apiGet } from "../../shared/api/platform-api";

type TenantUser = BlogAuthorOption & { id: number };

export const blogEditorHost: BlogsEditorHost = {
  async listAuthors(search) {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return apiGet<TenantUser[]>(`/tenant/access/users${query}`, "tenant");
  },
  async listImages() {
    const files = await fileManagerRequest<BlogMediaFile[]>("/files");
    return files.map(resolveMediaUrl);
  },
  async uploadImage(file) {
    const connections = await fileManagerRequest<StorageConnection[]>("/connections");
    if (!connections.some((item) => item.isDefault && item.status === "active")) {
      throw new Error(
        "Create an active default connection in File Manager → Storage Connections before uploading images."
      );
    }
    const body = new FormData();
    body.set("file", file);
    const uploaded = await fileManagerRequest<BlogMediaFile>("/files/upload", {
      method: "POST",
      body
    });
    return resolveMediaUrl(uploaded);
  }
};

type StorageConnection = { isDefault: boolean; status: "active" | "inactive" };

async function fileManagerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/platform/file-manager${path}`, {
    credentials: "include",
    ...init
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `File Manager request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function resolveMediaUrl(file: BlogMediaFile): BlogMediaFile {
  if (/^(?:https?:|blob:|data:)/u.test(file.url)) return file;
  const path = file.url.startsWith("/") ? file.url : `/${file.url}`;
  return { ...file, url: `/api/platform/file-manager${path}` };
}
