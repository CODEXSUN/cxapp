export const accessControlSync = { conflictPolicy: "server-wins", direction: "pull-only" } as const;
export function accessControlNeedsSync(clientVersion: number, serverVersion: number) {
  return serverVersion > clientVersion;
}
