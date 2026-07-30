export const entitlementSync = {
  conflictPolicy: "server-wins",
  direction: "pull-only"
} as const;

export function entitlementNeedsSync(clientVersion: number, serverVersion: number) {
  return serverVersion > clientVersion;
}
