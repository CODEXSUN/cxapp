export const databaseMaintenanceSync = {
  conflictPolicy: "server-wins",
  direction: "pull-only"
} as const;
export function databaseMaintenanceNeedsSync(clientVersion: number, serverVersion: number) {
  return serverVersion > clientVersion;
}
