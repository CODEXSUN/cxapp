export const appRegistrySync = {
  conflictPolicy: "server-wins",
  direction: "pull-only",
  scope: "platform"
} as const;

export function appRegistryNeedsSync(clientVersion: number, serverVersion: number) {
  return serverVersion > clientVersion;
}
