export type TenantPublicStory = {
  excerpt: string;
  featuredImage: string;
  imageAlt: string;
  kind: "page" | "post";
  publishedAt: string | null;
  slug: string;
  title: string;
};

type ApiEnvelope<T> = {
  data: T;
  error?: { message?: string };
  success: boolean;
};

export async function listTenantPublicStories() {
  const response = await fetch("/api/platform/public/blog?search=");
  const body = (await response.json()) as ApiEnvelope<TenantPublicStory[]>;
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? "Stories could not be loaded.");
  }
  return body.data;
}

export function tenantStoryImage(value: string, mediaBasePath: string) {
  const source = value.trim();
  if (!source) return "";
  if (/^(https?:|data:|blob:)/iu.test(source) || source.startsWith("/storage/")) return source;
  if (source.startsWith("/blog/") || source.startsWith("/uploads/")) {
    return `${mediaBasePath}/${source.split("/").pop()}`;
  }
  if (source.startsWith("/")) return source;
  return `${mediaBasePath}/${source.replace(/^\/+/, "")}`;
}
