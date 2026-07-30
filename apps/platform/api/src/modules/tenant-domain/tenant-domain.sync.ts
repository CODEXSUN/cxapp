export const tenantDomainSync = {
  conflictPolicy: "server-wins",
  direction: "pull-only",
  offlineWrites: false,
  scope: "platform"
} as const;

export function resolveTenantDomainSync(localUpdatedAt: string | null, serverUpdatedAt: string) {
  if (!localUpdatedAt) return "pull";
  return Date.parse(serverUpdatedAt) >= Date.parse(localUpdatedAt) ? "pull" : "reject-local";
}
