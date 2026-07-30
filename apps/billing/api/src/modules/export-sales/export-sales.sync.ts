export const exportSalesSync = {
  conflictPolicy: "manual-review",
  direction: "bidirectional",
  scope: "tenant"
} as const;

export function resolveExportSalesSync(localVersion: number, serverVersion: number) {
  if (localVersion === serverVersion) return "in-sync";
  if (localVersion < serverVersion) return "pull";
  return "manual-review";
}
