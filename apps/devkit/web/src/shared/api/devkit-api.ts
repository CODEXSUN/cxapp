type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/devkit${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers
    }
  });
  const text = await response.text();
  if (!text) throw new Error(`Devkit API returned an empty response (${response.status}).`);
  let envelope: ApiEnvelope<T>;
  try {
    envelope = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(`Devkit API returned an invalid response (${response.status}).`);
  }
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.success ? "Request failed" : envelope.error.message);
  }
  return envelope.data;
}

export const apiGet = <T>(path: string, _scope?: string) => request<T>(path, { method: "GET" });
export const apiPost = <T>(path: string, data?: unknown, _scope?: string) =>
  request<T>(path, { body: JSON.stringify(data ?? {}), method: "POST" });
export const apiPut = <T>(path: string, data?: unknown, _scope?: string) =>
  request<T>(path, { body: JSON.stringify(data ?? {}), method: "PUT" });
export const apiDelete = <T>(path: string, _scope?: string) =>
  request<T>(path, { method: "DELETE" });
export const apiBinaryPost = <T>(path: string, data: Blob, headers: Record<string, string>) =>
  request<T>(path, {
    body: data,
    headers: { "Content-Type": "application/octet-stream", ...headers },
    method: "POST"
  });
export async function apiGetBlob(path: string) {
  const response = await fetch(`/api/devkit${path}`, {
    credentials: "include",
    method: "GET"
  });
  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
    throw new Error(
      envelope && !envelope.success
        ? envelope.error.message
        : `Devkit API download failed (${response.status}).`
    );
  }
  return response.blob();
}
