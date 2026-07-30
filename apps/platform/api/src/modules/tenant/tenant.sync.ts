export const tenantSync = {
  conflictPolicy: "server-wins",
  direction: "pull-only",
  offlineWrites: false,
  scope: "platform"
} as const;

export function resolveTenantSync(localVersion: number | null, serverVersion: number) {
  if (localVersion === null || serverVersion >= localVersion) return "pull";
  return "reject-local";
}
