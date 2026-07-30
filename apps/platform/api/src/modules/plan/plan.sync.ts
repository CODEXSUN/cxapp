export const planSync = { conflictPolicy: "server-wins", direction: "pull-only" } as const;
export function planNeedsSync(clientVersion: number, serverVersion: number) {
  return serverVersion > clientVersion;
}
