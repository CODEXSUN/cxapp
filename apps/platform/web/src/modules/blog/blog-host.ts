import type { BlogAuthorOption, BlogsEditorHost } from "@codexsun/blog/web";
import { apiGet } from "../../shared/api/platform-api";

type TenantUser = BlogAuthorOption & { id: number };

export const blogEditorHost: BlogsEditorHost = {
  async listAuthors(search) {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return apiGet<TenantUser[]>(`/tenant/access/users${query}`, "tenant");
  },
  async listImages() {
    return [];
  },
  async uploadImage() {
    throw new Error("Image uploads are unavailable because no media storage integration is configured.");
  }
};
