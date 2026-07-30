export const salesSync = {
  conflictPolicy: "manual-review",
  direction: "bidirectional",
  scope: "tenant"
} as const;

export function resolveSalesSync(localVersion: number, serverVersion: number) {
  if (localVersion === serverVersion) return "in-sync";
  if (localVersion < serverVersion) return "pull";
  return "manual-review";
}
