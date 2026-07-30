const tenantRoot = "/app/devkit";
const superAdminRoot = "/sa/devkit";

export function devkitUrl(workspace = "registry", search = ""): string {
  const normalizedWorkspace = workspace.replace(/^\/+|\/+$/gu, "") || "registry";
  const normalizedSearch = search ? (search.startsWith("?") ? search : `?${search}`) : "";

  if (window.location.pathname.startsWith("/sa/")) {
    const [page, ...children] = normalizedWorkspace.split("/");
    return `${superAdminRoot}-${page}${children.length ? `/${children.join("/")}` : ""}${normalizedSearch}`;
  }

  return `${tenantRoot}/${normalizedWorkspace}${normalizedSearch}`;
}

export function openDevkitWorkspace(workspace: string, search = "") {
  window.location.assign(devkitUrl(workspace, search));
}
