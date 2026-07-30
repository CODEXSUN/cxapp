export const platformActivitySync = {
  conflictPolicy: "server-wins",
  direction: "pull-only"
} as const;
export function platformActivityNeedsSync(clientVersion: number, serverVersion: number) {
  return serverVersion > clientVersion;
}
