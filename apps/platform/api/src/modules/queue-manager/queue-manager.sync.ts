export const queueManagerSync = { conflictPolicy: "server-wins", direction: "pull-only" } as const;
export function queueJobNeedsSync(clientVersion: number, serverVersion: number) {
  return serverVersion > clientVersion;
}
